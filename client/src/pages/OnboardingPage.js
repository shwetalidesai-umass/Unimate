import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingStepper from '../components/auth/OnboardingStepper';
import OnboardingCard from '../components/auth/OnboardingCard';

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step === 2) {
      navigate('/dashboard');
    } else {
      setStep((current) => Math.min(current + 1, 2));
    }
  };

  return (
    <div className="page-shell onboarding-shell">
      <div className="brand-top">
        <img src="/logo.png" alt="UniMate" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
        <div className="brand-name">
          <span>Uni</span>
          <span className="brand-emphasis">Mate</span>
        </div>
      </div>
      <OnboardingStepper current={step} />
      <OnboardingCard
        step={step}
        onNext={handleNext}
        onBack={() => setStep((current) => Math.max(current - 1, 1))}
      />
    </div>
  );
}

export default OnboardingPage;