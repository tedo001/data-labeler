import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image, Rect, Transformer } from 'react-konva';
import useImage from 'use-image';
import { Annotation, ClassDefinition, BoundingBox } from '../types';

interface AnnotationCanvasProps {
  imageFile: {
    url: string;
    width: number;
    height: number;
    annotations: Annotation[];
  };
  classes: ClassDefinition[];
  selectedClassId: number;
  onUpdateAnnotations: (annotations: Annotation[]) => void;
  onSelectAnnotation: (id: string | null) => void;
  selectedAnnotationId: string | null;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageFile,
  classes,
  selectedClassId,
  onUpdateAnnotations,
  onSelectAnnotation,
  selectedAnnotationId,
}) => {
  const [image] = useImage(imageFile.url);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [newBox, setNewBox] = useState<BoundingBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setStageSize({ width: clientWidth, height: clientHeight });
        
        if (image) {
          const scaleX = clientWidth / image.width;
          const scaleY = clientHeight / image.height;
          setScale(Math.min(scaleX, scaleY));
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [image]);

  const handleMouseDown = (e: any) => {
    if (e.target !== e.target.getStage()) {
      const clickedId = e.target.id();
      if (clickedId) {
        onSelectAnnotation(clickedId);
        return;
      }
    }

    onSelectAnnotation(null);
    const pos = e.target.getStage().getPointerPosition();
    const x = (pos.x - (stageSize.width - image!.width * scale) / 2) / (image!.width * scale);
    const y = (pos.y - (stageSize.height - image!.height * scale) / 2) / (image!.height * scale);

    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setIsDrawing(true);
      setNewBox({ x, y, width: 0, height: 0, classId: selectedClassId });
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !newBox) return;

    const pos = e.target.getStage().getPointerPosition();
    const x = (pos.x - (stageSize.width - image!.width * scale) / 2) / (image!.width * scale);
    const y = (pos.y - (stageSize.height - image!.height * scale) / 2) / (image!.height * scale);

    setNewBox({
      ...newBox,
      width: Math.max(0, x - newBox.x),
      height: Math.max(0, y - newBox.y),
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && newBox && newBox.width > 0.01 && newBox.height > 0.01) {
      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        box: {
          ...newBox,
          x: newBox.x + newBox.width / 2, // Convert to YOLO x_center
          y: newBox.y + newBox.height / 2, // Convert to YOLO y_center
        },
      };
      onUpdateAnnotations([...imageFile.annotations, newAnnotation]);
    }
    setIsDrawing(false);
    setNewBox(null);
  };

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const id = node.id();
    const updatedAnnotations = imageFile.annotations.map(ann => {
      if (ann.id === id) {
        const x_center = (node.x() + (node.width() * node.scaleX()) / 2 - (stageSize.width - image!.width * scale) / 2) / (image!.width * scale);
        const y_center = (node.y() + (node.height() * node.scaleY()) / 2 - (stageSize.height - image!.height * scale) / 2) / (image!.height * scale);
        const width = (node.width() * node.scaleX()) / (image!.width * scale);
        const height = (node.height() * node.scaleY()) / (image!.height * scale);

        return {
          ...ann,
          box: { ...ann.box, x: x_center, y: y_center, width, height },
        };
      }
      return ann;
    });
    onUpdateAnnotations(updatedAnnotations);
  };

  useEffect(() => {
    if (selectedAnnotationId && transformerRef.current) {
      const stage = transformerRef.current.getStage();
      const selectedNode = stage.findOne('#' + selectedAnnotationId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedAnnotationId]);

  const offsetX = (stageSize.width - (image?.width || 0) * scale) / 2;
  const offsetY = (stageSize.height - (image?.height || 0) * scale) / 2;

  return (
    <div ref={containerRef} className="w-full h-full bg-neutral-900 overflow-hidden relative">
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          {image && (
            <Image
              image={image}
              x={offsetX}
              y={offsetY}
              width={image.width * scale}
              height={image.height * scale}
            />
          )}
          {imageFile.annotations.map((ann) => {
            const classDef = classes.find(c => c.id === ann.box.classId);
            const rectWidth = ann.box.width * (image?.width || 0) * scale;
            const rectHeight = ann.box.height * (image?.height || 0) * scale;
            const rectX = ann.box.x * (image?.width || 0) * scale - rectWidth / 2 + offsetX;
            const rectY = ann.box.y * (image?.height || 0) * scale - rectHeight / 2 + offsetY;

            return (
              <Rect
                key={ann.id}
                id={ann.id}
                x={rectX}
                y={rectY}
                width={rectWidth}
                height={rectHeight}
                stroke={classDef?.color || '#ff0000'}
                strokeWidth={2}
                draggable={selectedAnnotationId === ann.id}
                onDragEnd={handleTransformEnd}
                onTransformEnd={handleTransformEnd}
              />
            );
          })}
          {newBox && (
            <Rect
              x={newBox.x * (image?.width || 0) * scale + offsetX}
              y={newBox.y * (image?.height || 0) * scale + offsetY}
              width={newBox.width * (image?.width || 0) * scale}
              height={newBox.height * (image?.height || 0) * scale}
              stroke={classes.find(c => c.id === selectedClassId)?.color || '#ff0000'}
              strokeWidth={1}
              dash={[5, 5]}
            />
          )}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default AnnotationCanvas;
