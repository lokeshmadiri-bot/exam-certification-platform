import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useExam } from '../context/ExamContext';

export default function LeftSidebar() {
  const {
    questions,
    currentIdx,
    setCurrentIdx,
    answers,
    visitedQuestions,
    markedQuestions
  } = useExam();

  const [expandedSection, setExpandedSection] = useState(1);

  // Group questions by difficulty dynamically with their original indices
  const easyQuestions = [];
  const mediumQuestions = [];
  const hardQuestions = [];

  questions.forEach((q, originalIndex) => {
    const diff = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
    const questionWithIdx = { ...q, originalIndex };
    if (diff === 'HARD') {
      hardQuestions.push(questionWithIdx);
    } else if (diff === 'MEDIUM') {
      mediumQuestions.push(questionWithIdx);
    } else {
      easyQuestions.push(questionWithIdx);
    }
  });

  // Automatically expand the section containing the currently active question
  useEffect(() => {
    if (questions && questions[currentIdx]) {
      const q = questions[currentIdx];
      const diff = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
      if (diff === 'HARD') {
        setExpandedSection(3);
      } else if (diff === 'MEDIUM') {
        setExpandedSection(2);
      } else {
        setExpandedSection(1);
      }
    }
  }, [currentIdx, questions]);

  const toggleSection = (sectionNum) => {
    setExpandedSection(expandedSection === sectionNum ? null : sectionNum);
  };

  const renderSectionQuestions = (sectionQs) => {
    if (sectionQs.length === 0) {
      return (
        <div className="text-[12px] text-[#8A99AE] italic py-2 pl-4">
          No questions in this section
        </div>
      );
    }

    return (
      <div className="qnav pt-2 pb-4 transition-all duration-300">
        {sectionQs.map((q, sectionIdx) => {
          const isAnswered = answers[q.id] !== undefined;
          const isVisited = visitedQuestions.has(q.id);
          const isMarked = markedQuestions.has(q.id);
          const isActive = q.originalIndex === currentIdx;

          let btnClass;
          if (isActive) {
            btnClass = 'status-current';
          } else if (isAnswered && isMarked) {
            btnClass = 'status-answered-marked';
          } else if (isMarked) {
            btnClass = 'status-marked';
          } else if (isAnswered) {
            btnClass = 'status-answered';
          } else if (isVisited) {
            btnClass = 'status-visited';
          } else {
            btnClass = 'status-unvisited';
          }

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(q.originalIndex)}
              className={`aspect-square rounded-lg font-mono text-xs flex items-center justify-center border transition-all ${btnClass}`}
            >
              {sectionIdx + 1}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="run-left-aside flex flex-col gap-4">
      <div className="aside-h text-[11px] text-[#8A99AE] font-semibold uppercase font-mono mb-2">
        Exam sections
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {/* Section 1 Accordion */}
        {easyQuestions.length > 0 && (
          <div className="run-section-card">
            <button
              onClick={() => toggleSection(1)}
              className={`run-section-btn ${expandedSection === 1 ? 'active' : ''}`}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: expandedSection === 1 ? '#2F6BFF' : '#FFFFFF' }}>
                  Section 1
                </div>
                <div style={{ fontSize: '11px', color: '#8A99AE', marginTop: '2px' }}>
                  Beginner Level – MCQ ({easyQuestions.length})
                </div>
              </div>
              {expandedSection === 1 ? (
                <ChevronDown className="w-4 h-4 text-[#8A99AE]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8A99AE]" />
              )}
            </button>
            {expandedSection === 1 && (
              <div className="run-section-content">
                {renderSectionQuestions(easyQuestions)}
              </div>
            )}
          </div>
        )}

        {/* Section 2 Accordion */}
        {mediumQuestions.length > 0 && (
          <div className="run-section-card">
            <button
              onClick={() => toggleSection(2)}
              className={`run-section-btn ${expandedSection === 2 ? 'active' : ''}`}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: expandedSection === 2 ? '#2F6BFF' : '#FFFFFF' }}>
                  Section 2
                </div>
                <div style={{ fontSize: '11px', color: '#8A99AE', marginTop: '2px' }}>
                  Intermediate Level – MCQ ({mediumQuestions.length})
                </div>
              </div>
              {expandedSection === 2 ? (
                <ChevronDown className="w-4 h-4 text-[#8A99AE]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8A99AE]" />
              )}
            </button>
            {expandedSection === 2 && (
              <div className="run-section-content">
                {renderSectionQuestions(mediumQuestions)}
              </div>
            )}
          </div>
        )}

        {/* Section 3 Accordion */}
        {hardQuestions.length > 0 && (
          <div className="run-section-card">
            <button
              onClick={() => toggleSection(3)}
              className={`run-section-btn ${expandedSection === 3 ? 'active' : ''}`}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: expandedSection === 3 ? '#2F6BFF' : '#FFFFFF' }}>
                  Section 3
                </div>
                <div style={{ fontSize: '11px', color: '#8A99AE', marginTop: '2px' }}>
                  Advanced Level – MCQ ({hardQuestions.length})
                </div>
              </div>
              {expandedSection === 3 ? (
                <ChevronDown className="w-4 h-4 text-[#8A99AE]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8A99AE]" />
              )}
            </button>
            {expandedSection === 3 && (
              <div className="run-section-content">
                {renderSectionQuestions(hardQuestions)}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
