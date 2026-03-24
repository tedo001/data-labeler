import React from 'react';
import { Plus, Trash2, Download, Image as ImageIcon, CheckCircle, BrainCircuit } from 'lucide-react';
import { ClassDefinition, ImageFile } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  classes: ClassDefinition[];
  selectedClassId: number;
  onSelectClass: (id: number) => void;
  onAddClass: (name: string) => void;
  onDeleteClass: (id: number) => void;
  images: ImageFile[];
  selectedImageId: string | null;
  onSelectImage: (id: string) => void;
  onUploadImages: (files: FileList) => void;
  onExport: () => void;
  onAutoLabel: () => void;
  isAutoLabeling: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  classes,
  selectedClassId,
  onSelectClass,
  onAddClass,
  onDeleteClass,
  images,
  selectedImageId,
  onSelectImage,
  onUploadImages,
  onExport,
  onAutoLabel,
  isAutoLabeling,
}) => {
  const [newClassName, setNewClassName] = React.useState('');

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      onAddClass(newClassName.trim());
      setNewClassName('');
    }
  };

  return (
    <div className="w-80 h-full bg-neutral-800 border-r border-neutral-700 flex flex-col text-neutral-200">
      <div className="p-4 border-b border-neutral-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-orange-500" />
          YOLO Labeler
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Classes Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Classes</h2>
          </div>
          <form onSubmit={handleAddClass} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="New class..."
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-500"
            />
            <button type="submit" className="p-1 bg-orange-600 hover:bg-orange-500 rounded transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </form>
          <div className="space-y-1">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => onSelectClass(cls.id)}
                className={cn(
                  "group flex items-center justify-between p-2 rounded cursor-pointer transition-colors",
                  selectedClassId === cls.id ? "bg-orange-600/20 border border-orange-600/50" : "hover:bg-neutral-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color }} />
                  <span className="text-sm font-medium">{cls.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteClass(cls.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Images Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Images</h2>
            <label className="cursor-pointer p-1 hover:bg-neutral-700 rounded transition-colors">
              <Plus className="w-4 h-4" />
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && onUploadImages(e.target.files)}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => (
              <div
                key={img.id}
                onClick={() => onSelectImage(img.id)}
                className={cn(
                  "relative aspect-square rounded overflow-hidden cursor-pointer border-2 transition-all",
                  selectedImageId === img.id ? "border-orange-500 scale-95" : "border-transparent hover:border-neutral-600"
                )}
              >
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                {img.annotations.length > 0 && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle className="w-4 h-4 text-green-500 fill-neutral-900" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                  <p className="text-[10px] truncate">{img.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-neutral-700 space-y-2">
        <button
          onClick={onAutoLabel}
          disabled={isAutoLabeling || images.length === 0 || classes.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-700 disabled:cursor-not-allowed py-2 rounded font-semibold transition-colors"
        >
          <BrainCircuit className={cn("w-4 h-4", isAutoLabeling && "animate-pulse")} />
          {isAutoLabeling ? "Auto-Labeling..." : "Auto-Label All"}
        </button>
        <button
          onClick={onExport}
          disabled={images.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:cursor-not-allowed py-2 rounded font-semibold transition-colors"
        >
          <Download className="w-4 h-4" />
          Export YOLO Labels
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
