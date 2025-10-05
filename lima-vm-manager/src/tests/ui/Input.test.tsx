import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input, Select, Checkbox } from '../../components/ui/Input';

describe('Input Component', () => {
  it('renders with basic props', () => {
    render(<Input value="test" onChange={() => {}} />);
    const input = screen.getByDisplayValue('test');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('border-gray-300');
  });

  it('renders with label', () => {
    render(<Input label="Test Label" value="" onChange={() => {}} />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<Input error="Error message" value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-error-300');
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(handleChange).toHaveBeenCalledWith('new value');
  });

  it('can be disabled', () => {
    render(<Input disabled value="test" onChange={() => {}} />);
    const input = screen.getByDisplayValue('test');
    expect(input).toBeDisabled();
  });
});

describe('Select Component', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ];

  it('renders with options', () => {
    render(<Select options={options} value="option1" onChange={() => {}} />);
    const select = screen.getByDisplayValue('Option 1');
    expect(select).toBeInTheDocument();
  });

  it('shows placeholder when no value', () => {
    render(
      <Select options={options} value="" onChange={() => {}} placeholder="Select..." />
    );
    const select = screen.getByDisplayValue('Select...');
    expect(select).toBeInTheDocument();
  });

  it('handles selection changes', () => {
    const handleChange = jest.fn();
    render(<Select options={options} value="option1" onChange={handleChange} />);

    const select = screen.getByDisplayValue('Option 1');
    fireEvent.change(select, { target: { value: 'option2' } });

    expect(handleChange).toHaveBeenCalledWith('option2');
  });
});

describe('Checkbox Component', () => {
  it('renders unchecked', () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Test" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders checked', () => {
    render(<Checkbox checked={true} onChange={() => {}} label="Test" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('handles change events', () => {
    const handleChange = jest.fn();
    render(<Checkbox checked={false} onChange={handleChange} label="Test" />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('shows required indicator', () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Required" required />);
    expect(screen.getByText('Required *')).toBeInTheDocument();
  });
});