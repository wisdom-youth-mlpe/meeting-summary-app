import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QHLSTable from '../components/QHLSTable';

const rows = [
  { unit: 'Unit A', status: '' },
  { unit: 'Unit B', status: 'nadannu' },
  { unit: 'Unit C', status: 'illa', carried: true },
];

// Each unit is a group of three toggle buttons named after the unit
const statusOf = (unit) => {
  const pressed = within(screen.getByRole('group', { name: unit }))
    .getAllByRole('button')
    .find(b => b.getAttribute('aria-pressed') === 'true');
  return pressed ? pressed.textContent : '';
};

const pick = (unit, label) =>
  userEvent.click(within(screen.getByRole('group', { name: unit })).getByRole('button', { name: label }));

describe('QHLSTable', () => {
  test('lists each unit with its status; carried QHLS ഇല്ല units are hidden', () => {
    render(<QHLSTable qhlsData={rows} onQHLSChange={() => {}} />);
    expect(statusOf('Unit A')).toBe('');
    expect(statusOf('Unit B')).toBe('നടന്നു');
    expect(screen.queryByRole('group', { name: 'Unit C' })).not.toBeInTheDocument();
  });

  test('offers all three statuses', () => {
    render(<QHLSTable qhlsData={rows} onQHLSChange={() => {}} />);
    const labels = within(screen.getByRole('group', { name: 'Unit A' })).getAllByRole('button').map(b => b.textContent);
    expect(labels).toEqual(['നടന്നു', 'നടന്നിട്ടില്ല', 'QHLS ഇല്ല']);
  });

  test('shows how many visible units have an answer', () => {
    render(<QHLSTable qhlsData={rows} onQHLSChange={() => {}} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  test('picking a status reports the updated rows', async () => {
    const onChange = vi.fn();
    render(<QHLSTable qhlsData={rows} onQHLSChange={onChange} />);
    await pick('Unit A', 'നടന്നിട്ടില്ല');
    expect(onChange).toHaveBeenCalledWith([
      { unit: 'Unit A', status: 'nadannittilla' }, rows[1], rows[2],
    ]);
  });

  test('selecting QHLS ഇല്ല keeps the unit in the list until save', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<QHLSTable qhlsData={rows} onQHLSChange={onChange} />);
    await pick('Unit A', 'QHLS ഇല്ല');
    rerender(<QHLSTable qhlsData={onChange.mock.calls[0][0]} onQHLSChange={onChange} />);
    expect(statusOf('Unit A')).toBe('QHLS ഇല്ല');
  });

  test('restore link brings a hidden unit back with no status', async () => {
    const onChange = vi.fn();
    render(<QHLSTable qhlsData={rows} onQHLSChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /പുതിയ QHLS ചേർക്കുക/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Unit C' }));
    expect(onChange.mock.calls[0][0][2]).toMatchObject({ unit: 'Unit C', status: '', carried: false, restored: true });
  });

  test('no restore link when nothing is hidden', () => {
    render(<QHLSTable qhlsData={rows.slice(0, 2)} onQHLSChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /പുതിയ QHLS ചേർക്കുക/ })).not.toBeInTheDocument();
  });
});
