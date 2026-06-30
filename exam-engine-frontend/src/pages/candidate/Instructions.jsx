import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, Monitor, HelpCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { examService } from '../../services/api';

export default function CandidateInstructions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [lang, setLang] = useState('en');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await examService.getExamById(examId);
        setExam(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadExam();
  }, [examId]);

  const I18N = {
    en: {
      title: "Exam instructions",
      lede: "Please read the rules carefully. You must agree before you can proceed to the camera check.",
      r1t: "Stay on the exam tab",
      r1: "Switching tabs, minimising or resizing the window each count as a strike. After 3 strikes the exam ends automatically.",
      r2t: "Camera & lighting",
      r2: "Sit facing a light source and avoid backlight. Keep your face fully in frame for the whole exam.",
      r3t: "Raise hand if you need help",
      r3: "Use Raise Hand to signal the invigilator. It pauses proctoring and answering. You may raise it up to 5 times.",
      r4t: "Refresh, back or closing = ended",
      r4: "Refreshing the page, pressing back or closing the tab submits your answers and ends the attempt. You cannot re-enter.",
      fmt: "Format at a glance",
      sec: "Sections",
      q: "Questions",
      dur: "Duration",
      autos: "You answer one section at a time and can revisit earlier sections before submitting. Answers save automatically as you go.",
      agt: "I have read and agree to the rules",
      ag: "Including proctoring, recording and termination conditions.",
      proceed: "Proceed to system check"
    },
    ja: {
      title: "試験の注意事項",
      lede: "ルールをよくお読みください。先へ進むには同意が必要です。",
      r1t: "試験タブから離れない",
      r1: "タブの切り替え・最小化・ウィンドウのサイズ変更はそれぞれ違反1回。3回で試験は自動終了します。",
      r2t: "カメラと照明",
      r2: "光の方を向いて座り、逆光を避けてください。試験中は顔が枠内に収まるようにしてください。",
      r3t: "困ったら挙手",
      r3: "挙手で監督者に合図できます。挙手中は監督と解答が一時停止します。最大5回まで可能です。",
      r4t: "更新・戻る・閉じる＝終了",
      r4: "ページの更新、戻る操作、タブを閉じると解答が送信され試験は終了します。再入室はできません。",
      fmt: "試験の概要",
      sec: "セクション",
      q: "問題数",
      dur: "制限時間",
      autos: "1セクションずつ解答し、提出前に前のセクションへ戻れます。解答は自動保存されます。",
      agt: "ルールを読み、同意します",
      ag: "監督・録画・終了条件を含みます。",
      proceed: "システムチェックへ進む"
    }
  };

  const t = I18N[lang];

  if (!exam) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading instructions...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="page-head mb-0">
          <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Step 1 of 3</span>
          <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1">{exam.title}</h1>
        </div>

        {/* Language Switcher */}
        <div className="lang-toggle flex bg-[#F4F7FC] border border-[#E4EAF2] rounded-xl p-[3px]">
          <button
            onClick={() => setLang('en')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${lang === 'en' ? 'bg-white text-[#2F6BFF] shadow-sm' : 'text-[#5C6B82]'}`}
          >
            English
          </button>
          <button
            onClick={() => setLang('ja')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${lang === 'ja' ? 'bg-white text-[#2F6BFF] shadow-sm' : 'text-[#5C6B82]'}`}
          >
            日本語
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6">
        {/* Left Side: Rules list */}
        <div className="card pad space-y-5 bg-white">
          <div className="pb-3 border-b border-[#EEF2F8]">
            <h2 className="font-display font-semibold text-lg text-[#0E1B2E]">{t.title}</h2>
            <p className="text-xs text-[#5C6B82] mt-1">{t.lede}</p>
          </div>

          <div className="space-y-4">
            <div className="instr flex gap-3.5">
              <div className="ic shrink-0 w-[38px] h-[38px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">{t.r1t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-0.5">{t.r1}</p>
              </div>
            </div>

            <div className="instr flex gap-3.5">
              <div className="ic shrink-0 w-[38px] h-[38px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">{t.r2t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-0.5">{t.r2}</p>
              </div>
            </div>

            <div className="instr flex gap-3.5">
              <div className="ic shrink-0 w-[38px] h-[38px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">{t.r3t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-0.5">{t.r3}</p>
              </div>
            </div>

            <div className="instr flex gap-3.5">
              <div className="ic shrink-0 w-[38px] h-[38px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">{t.r4t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-0.5">{t.r4}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Format & Consent */}
        <div className="space-y-4">
          <div className="card pad bg-white">
            <h3 className="font-display font-semibold text-sm text-[#0E1B2E] mb-3.5">{t.fmt}</h3>
            
            <div className="space-y-2.5 text-[13px] border-b border-[#EEF2F8] pb-3.5">
              <div className="flex justify-between">
                <span className="text-[#5C6B82]">{t.sec}</span>
                <b className="font-mono text-[#0E1B2E] font-semibold">9 sections</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6B82]">{t.q}</span>
                <b className="font-mono text-[#0E1B2E] font-semibold">{exam.perAttempt} MCQs</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6B82]">{t.dur}</span>
                <b className="font-mono text-[#0E1B2E] font-semibold">{exam.durationMinutes} minutes</b>
              </div>
            </div>

            <p className="text-[11.5px] text-[#5C6B82] leading-relaxed mt-3.5">
              {t.autos}
            </p>
          </div>

          <div className="card pad bg-white">
            <div 
              onClick={() => setAgreed(!agreed)}
              className="switch flex items-center gap-3 border border-[#E4EAF2] hover:border-[#c3d2ea] rounded-xl p-[14px_16px] cursor-pointer bg-white mb-4 transition-all"
            >
              <div className="t flex-1">
                <b className="text-[13.5px] font-semibold text-[#0E1B2E] block">{t.agt}</b>
                <span className="text-[12px] text-[#5C6B82] block leading-snug mt-0.5">{t.ag}</span>
              </div>
              <span className={`toggle shrink-0 w-11 h-[25px] rounded-full relative cursor-pointer transition-all ${agreed ? 'bg-[#2F6BFF]' : 'bg-[#c8d3e3]'}`}>
                <i className={`absolute top-0.5 w-[21px] h-[21px] rounded-full bg-white transition-all shadow-[0_1px_3px_rgba(0,0,0,0.2)] ${agreed ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </div>

            <button
              disabled={!agreed}
              onClick={() => navigate(`/candidate/check/${examId}`)}
              className="btn bg-[#2F6BFF] hover:bg-[#2256d6] disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3 rounded-xl shadow-md transition-all"
            >
              <span>{t.proceed}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
