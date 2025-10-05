import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal, ConfirmModal, AlertModal } from '../../components/ui/Modal';

describe('Modal Component', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal {...defaultProps} open={false} />);
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('applies size classes', () => {
    render(<Modal {...defaultProps} size="large" />);
    expect(screen.getByRole('dialog')).toHaveClass('max-w-2xl');
  });

  it('handles escape key', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ConfirmModal Component', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  it('renders with correct content', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });
});

describe('AlertModal Component', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    title: 'Alert',
    message: 'This is an alert message',
  };

  it('renders with correct content', () => {
    render(<AlertModal {...defaultProps} />);
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('This is an alert message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ok/i })).toBeInTheDocument();
  });

  it('calls onClose when button is clicked', () => {
    render(<AlertModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /ok/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows different icons for different types', () => {
    const { rerender } = render(<AlertModal {...defaultProps} type="error" />);
    expect(screen.getByLabelText(/error/i)).toBeInTheDocument();

    rerender(<AlertModal {...defaultProps} type="success" />);
    expect(screen.getByLabelText(/success/i)).toBeInTheDocument();

    rerender(<AlertModal {...defaultProps} type="warning" />);
    expect(screen.getByLabelText(/warning/i)).toBeInTheDocument();
  });
});