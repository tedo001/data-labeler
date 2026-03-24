import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import AnnotationCanvas from './components/AnnotationCanvas';
import { ImageFile, ClassDefinition, Annotation } from './types';
import { autoLabelImage } from './services/gemini';
import JSZip from 'jszip';
import { Trash2, ChevronLeft, ChevronRight, Maximize2, Minimize2, Image as ImageIcon } from 'lucide-react';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', 
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

export default function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [classes, setClasses] = useState<ClassDefinition[]>([
    { id: 0, name: 'Person', color: COLORS[0] },
    { id: 1, name: 'Car', color: COLORS[1] },
    { id: 2, name: 'Dog', color: COLORS[2] },
  ]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isAutoLabeling, setIsAutoLabeling] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedImage = images.find(img => img.id === selectedImageId);

  const handleUploadImages = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const imageFile: ImageFile = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: e.target?.result as string,
            annotations: [],
            width: img.width,
            height: img.height,
          };
          setImages(prev => {
            const updated = [...prev, imageFile];
            return updated;
          });
          setSelectedImageId(prev => prev || imageFile.id);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleAddClass = (name: string) => {
    const newClass: ClassDefinition = {
      id: classes.length > 0 ? Math.max(...classes.map(c => c.id)) + 1 : 0,
      name,
      color: COLORS[classes.length % COLORS.length],
    };
    setClasses([...classes, newClass]);
  };

  const handleDeleteClass = (id: number) => {
    setClasses(classes.filter(c => c.id !== id));
    if (selectedClassId === id) setSelectedClassId(classes[0]?.id || 0);
  };

  const handleUpdateAnnotations = (annotations: Annotation[]) => {
    if (!selectedImageId) return;
    setImages(images.map(img => 
      img.id === selectedImageId ? { ...img, annotations } : img
    ));
  };

  const handleAutoLabel = async () => {
    if (images.length === 0 || classes.length === 0) return;
    setIsAutoLabeling(true);
    
    try {
      const updatedImages = [...images];
      for (let i = 0; i < updatedImages.length; i++) {
        const img = updatedImages[i];
        if (img.annotations.length > 0) continue;

        const boxes = await autoLabelImage(img.url, classes);
        const newAnnotations: Annotation[] = boxes.map(box => ({
          id: Math.random().toString(36).substr(2, 9),
          box,
        }));
        
        updatedImages[i] = { ...img, annotations: newAnnotations };
        setImages([...updatedImages]);
      }
    } catch (error) {
      console.error("Auto-labeling failed:", error);
      alert("Auto-labeling failed. Please check your API key.");
    } finally {
      setIsAutoLabeling(false);
    }
  };

  const handleExport = async () => {
    const zip = new JSZip();
    const labelsFolder = zip.folder("labels");
    const imagesFolder = zip.folder("images");

    images.forEach(img => {
      const labelContent = img.annotations.map(ann => {
        const { x, y, width, height, classId } = ann.box;
        return `${classId} ${x.toFixed(6)} ${y.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
      }).join('\n');

      labelsFolder?.file(`${img.name.split('.')[0]}.txt`, labelContent);
      
      const base64Data = img.url.split(',')[1];
      imagesFolder?.file(img.name, base64Data, { base64: true });
    });

    const classesContent = classes.map(c => c.name).join('\n');
    zip.file("classes.txt", classesContent);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = "yolo_dataset.zip";
    link.click();
  };

  const handleDeleteAnnotation = () => {
    if (!selectedAnnotationId || !selectedImage) return;
    handleUpdateAnnotations(selectedImage.annotations.filter(a => a.id !== selectedAnnotationId));
    setSelectedAnnotationId(null);
  };

  const navigateImage = (direction: 'next' | 'prev') => {
    const currentIndex = images.findIndex(img => img.id === selectedImageId);
    if (direction === 'next' && currentIndex < images.length - 1) {
      setSelectedImageId(images[currentIndex + 1].id);
    } else if (direction === 'prev' && currentIndex > 0) {
      setSelectedImageId(images[currentIndex - 1].id);
    }
    setSelectedAnnotationId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteAnnotation();
      }
      if (e.key === 'ArrowRight') navigateImage('next');
      if (e.key === 'ArrowLeft') navigateImage('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, selectedImageId, images]);

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 overflow-hidden font-sans">
      <Sidebar
        classes={classes}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
        onAddClass={handleAddClass}
        onDeleteClass={handleDeleteClass}
        images={images}
        selectedImageId={selectedImageId}
        onSelectImage={setSelectedImageId}
        onUploadImages={handleUploadImages}
        onExport={handleExport}
        onAutoLabel={handleAutoLabel}
        isAutoLabeling={isAutoLabeling}
      />

      <main className="flex-1 flex flex-col relative">
        <div className="h-14 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-neutral-900 rounded px-3 py-1 border border-neutral-700">
              <span className="text-xs text-neutral-400 font-mono uppercase">Image</span>
              <span className="text-sm font-medium truncate max-w-[200px]">{selectedImage?.name || 'No image selected'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateImage('prev')}
                disabled={!selectedImageId || images.findIndex(i => i.id === selectedImageId) === 0}
                className="p-1.5 hover:bg-neutral-700 rounded disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateImage('next')}
                disabled={!selectedImageId || images.findIndex(i => i.id === selectedImageId) === images.length - 1}
                className="p-1.5 hover:bg-neutral-700 rounded disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedAnnotationId && (
              <button
                onClick={handleDeleteAnnotation}
                className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-1.5 rounded text-sm transition-colors border border-red-600/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete Box
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-neutral-700 rounded transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 bg-neutral-950 relative overflow-hidden">
          {selectedImage ? (
            <AnnotationCanvas
              imageFile={selectedImage}
              classes={classes}
              selectedClassId={selectedClassId}
              onUpdateAnnotations={handleUpdateAnnotations}
              onSelectAnnotation={setSelectedAnnotationId}
              selectedAnnotationId={selectedAnnotationId}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 gap-4">
              <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center">
                <ImageIcon className="w-10 h-10" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">No Image Selected</p>
                <p className="text-sm">Upload images from the sidebar to start labeling</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none z-10">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-[11px] text-neutral-300 flex gap-6">
              <span className="flex items-center gap-1.5"><span className="bg-neutral-700 px-1.5 py-0.5 rounded text-white">Drag</span> Draw Box</span>
              <span className="flex items-center gap-1.5"><span className="bg-neutral-700 px-1.5 py-0.5 rounded text-white">Click</span> Select Box</span>
              <span className="flex items-center gap-1.5"><span className="bg-neutral-700 px-1.5 py-0.5 rounded text-white">Del</span> Remove Selected</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
