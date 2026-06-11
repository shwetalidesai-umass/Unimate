import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="stars">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          className={`star ${n <= (hover || value) ? 'filled' : ''}`}
          onClick={() => !readonly && onChange && onChange(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          type="button"
        >★</button>
      ))}
    </div>
  );
}

describe('StarRating', () => {
  test('renders 5 stars', () => {
    render(<StarRating value={0} />);
    const stars = screen.getAllByText('★');
    expect(stars).toHaveLength(5);
  });

  test('calls onChange when star is clicked', () => {
    const handleChange = jest.fn();
    render(<StarRating value={0} onChange={handleChange} />);
    const stars = screen.getAllByText('★');
    fireEvent.click(stars[2]);
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  test('does not call onChange when readonly', () => {
    const handleChange = jest.fn();
    render(<StarRating value={3} onChange={handleChange} readonly />);
    const stars = screen.getAllByText('★');
    fireEvent.click(stars[0]);
    expect(handleChange).not.toHaveBeenCalled();
  });

  test('stars are disabled when readonly', () => {
    render(<StarRating value={3} readonly />);
    const stars = screen.getAllByRole('button');
    stars.forEach(star => expect(star).toBeDisabled());
  });

  test('clicking first star calls onChange with 1', () => {
    const handleChange = jest.fn();
    render(<StarRating value={0} onChange={handleChange} />);
    const stars = screen.getAllByText('★');
    fireEvent.click(stars[0]);
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  test('clicking last star calls onChange with 5', () => {
    const handleChange = jest.fn();
    render(<StarRating value={0} onChange={handleChange} />);
    const stars = screen.getAllByText('★');
    fireEvent.click(stars[4]);
    expect(handleChange).toHaveBeenCalledWith(5);
  });
});