import React from 'react';

const steps = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Courses' }
];

function OnboardingStepper({ current }) {
  return (
    <div className="onboarding-stepper">
      {steps.map((step, index) => {
        const completed = step.id < current;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <div className={`step-item ${completed ? 'completed' : ''} ${active ? 'active' : ''}`}>
              <div className="step-circle">{step.id}</div>
              <div className="step-label">{step.label}</div>
            </div>
            {index < steps.length - 1 && <div className="step-connector" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default OnboardingStepper;