import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QHLSTable from '../components/QHLSTable';

const rows = [
  { unit: 'Unit A', status: '' },
  { unit: 'Unit B', status: 'nadannu' },
  { unit: 'Unit C', status: 'illa', carried: true },
];

describe('QHLSTable', () => {
  test('lists each unit with its status; carried QHLS ഇല്ല units are hidden', () => {
    render(<QHLSTable qhlsData={rows} onQHLSChange={() => {}} />);
    expect(screen.getByLabelText('Unit A')).toHaveValue('');
    expect(screen.getByLabelText('Unit B')).toHaveValue('nadannu');
    expect(screen.queryByLabelText('Unit C')).not.toBeInTheDocument();
  });

  test('offers all three statuses', () => {
    render(<QHLSTable qhlsData={rows} onQHLSChange={() => {}} />);
    const options = [...screen.getByLabelText('Unit A').options].map(o => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['നടന്നു', 'നടന്നിട്ടില്ല', 'QHLS ഇല്ല']));
  });

  test('picking a status reports the updated rows', async () => {
    const onChange = vi.fn();
    render(<QHLSTable qhlsData={rows} onQHLSChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Unit A'), 'nadannittilla');
    expect(onChange).toHaveBeenCalledWith([
      { unit: 'Unit A', status: 'nadannittilla' }, rows[1], rows[2],
    ]);
  });

  test('selecting QHLS ഇല്ല keeps the unit in the list until save', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<QHLSTable qhlsData={rows} onQHLSChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Unit A'), 'illa');
    rerender(<QHLSTable qhlsData={onChange.mock.calls[0][0]} onQHLSChange={onChange} />);
    expect(screen.getByLabelText('Unit A')).toHaveValue('illa');
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
