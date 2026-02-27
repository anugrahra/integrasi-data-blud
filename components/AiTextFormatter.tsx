import React from 'react';

export default function AiTextFormatter({ text }: { text: string }) {
  if (!text) return null;

  return (
    <>
      {text.split('\n').map((line, lineIndex) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return <div key={lineIndex} className="h-1.5"></div>;

        const isBullet = trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ');
        const cleanLine = isBullet ? trimmedLine.substring(2) : trimmedLine;

        const renderFormat = (textString: string) => {
          const parts = textString.split(/(\*\*.*?\*\*|\*.*?\*)/g);
          return parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIndex} className="font-bold text-indigo-900">{part.slice(2, -2)}</strong>;
            } else if (part.startsWith('*') && part.endsWith('*')) {
              return <em key={partIndex} className="italic text-indigo-700">{part.slice(1, -1)}</em>;
            }
            return <span key={partIndex}>{part}</span>;
          });
        };

        if (isBullet) {
          return (
            <div key={lineIndex} className="flex items-start gap-2 mb-1.5 ml-1">
              <span className="text-indigo-500 font-bold mt-0.5">•</span>
              <div className="flex-1">{renderFormat(cleanLine)}</div>
            </div>
          );
        }

        return <p key={lineIndex} className="mb-2 text-justify">{renderFormat(cleanLine)}</p>;
      })}
    </>
  );
}