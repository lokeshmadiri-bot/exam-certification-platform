import { useExam } from '../context/ExamContext';

export function useRaiseHand() {
  const {
    handRaised,
    setHandRaised,
    raiseCount,
    setRaiseCount,
    setToastMsg,
    setToastShow
  } = useExam();

  const raiseHand = () => {
    if (raiseCount >= 5) {
      setToastMsg('Raise-hand limit reached (5 of 5)');
      setToastShow(true);
      return false;
    }
    setRaiseCount((prev) => prev + 1);
    setHandRaised(true);
    return true;
  };

  const lowerHand = () => {
    setHandRaised(false);
    setToastMsg('Resumed · proctoring active');
    setToastShow(true);
  };

  return {
    handRaised,
    raiseCount,
    raiseHand,
    lowerHand
  };
}
