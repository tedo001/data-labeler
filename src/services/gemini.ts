import { GoogleGenAI, Type } from "@google/genai";
import { BoundingBox, ClassDefinition } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function autoLabelImage(
  base64Image: string,
  classes: ClassDefinition[]
): Promise<BoundingBox[]> {
  const classNames = classes.map(c => c.name).join(", ");
  const prompt = `Detect the following objects in the image: ${classNames}.
Return the bounding boxes in JSON format.
For each object, provide the class name and the [ymin, xmin, ymax, xmax] coordinates in a 0-1000 scale.
Only detect objects from the specified classes.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            class: { type: Type.STRING },
            box_2d: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "[ymin, xmin, ymax, xmax] in 0-1000 scale",
            },
          },
          required: ["class", "box_2d"],
        },
      },
    },
  });

  const detections = JSON.parse(response.text || "[]");
  const results: BoundingBox[] = [];

  for (const det of detections) {
    const classDef = classes.find(c => c.name.toLowerCase() === det.class.toLowerCase());
    if (classDef && det.box_2d.length === 4) {
      const [ymin, xmin, ymax, xmax] = det.box_2d;
      
      // Convert 0-1000 to 0-1
      const x1 = xmin / 1000;
      const y1 = ymin / 1000;
      const x2 = xmax / 1000;
      const y2 = ymax / 1000;

      // Convert to YOLO format: x_center, y_center, width, height
      const width = x2 - x1;
      const height = y2 - y1;
      const x_center = x1 + width / 2;
      const y_center = y1 + height / 2;

      results.push({
        x: x_center,
        y: y_center,
        width,
        height,
        classId: classDef.id,
      });
    }
  }

  return results;
}
