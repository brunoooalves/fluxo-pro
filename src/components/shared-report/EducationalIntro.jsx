import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { INTRO, GLOSSARY } from './educationalCopy';

export default function EducationalIntro({ hasIntercaladas }) {
  const [expanded, setExpanded] = useState(false);

  const terms = [
    GLOSSARY.entrada,
    GLOSSARY.mensais,
    ...(hasIntercaladas ? [GLOSSARY.intercaladas] : []),
    GLOSSARY.saldoPosChaves,
  ];

  return (
    <div className="bg-blue-50 rounded-2xl border border-blue-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-blue-600" />
          <div>
            <h2 className="text-base font-bold text-gray-900">{INTRO.title}</h2>
            {!expanded && (
              <p className="text-xs text-gray-500 mt-0.5">Toque para ver os termos</p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          <p className="text-sm text-gray-600 mb-4">{INTRO.subtitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {terms.map((item) => (
              <div key={item.term} className="bg-white rounded-xl p-3 border border-blue-100">
                <p className="text-sm font-semibold text-gray-900 mb-1">{item.term}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
