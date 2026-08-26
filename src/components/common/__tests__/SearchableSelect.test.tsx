import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SearchableSelect, type SearchableOption } from '../SearchableSelect';

describe('SearchableSelect component', () => {
  afterEach(() => {
    cleanup();
  });

  const mockOptions: SearchableOption[] = [
    {
      value: 'FAC-001',
      label: 'Mr. Juan Dela Cruz',
      sublabel: 'Information Technology · Max Load: 24 hrs',
      badge: 'Full-Time',
      badgeTone: 'emerald',
      searchKeywords: ['juan', 'it', 'full-time'],
    },
    {
      value: 'FAC-002',
      label: 'Engr. Roberto Santos',
      sublabel: 'Information Technology · Max Load: 12 hrs',
      badge: 'Part-Time',
      badgeTone: 'amber',
      searchKeywords: ['roberto', 'it', 'part-time'],
    },
    {
      value: 'FAC-003',
      label: 'Dr. Alan Turing',
      sublabel: 'Computer Science · Program Head',
      badge: 'Full-Time',
      badgeTone: 'emerald',
      searchKeywords: ['alan', 'cs', 'head'],
    },
  ];

  it('renders with placeholder when no value is selected', () => {
    render(
      <SearchableSelect
        value=""
        onChange={() => {}}
        options={mockOptions}
        placeholder="Select instructor..."
      />
    );

    expect(screen.getByText('Select instructor...')).toBeDefined();
  });

  it('renders selected option label and badge', () => {
    render(
      <SearchableSelect
        value="FAC-001"
        onChange={() => {}}
        options={mockOptions}
      />
    );

    expect(screen.getByText('Mr. Juan Dela Cruz')).toBeDefined();
    expect(screen.getByText('Full-Time')).toBeDefined();
  });

  it('opens popover on click and filters options based on query', () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        value=""
        onChange={handleChange}
        options={mockOptions}
        placeholder="Select instructor..."
        searchPlaceholder="Type to search..."
      />
    );

    // Open dropdown
    const trigger = screen.getByRole('button', { name: /Select instructor.../i });
    fireEvent.click(trigger);

    // Search input should be rendered
    const searchInput = screen.getByPlaceholderText('Type to search...');
    expect(searchInput).toBeDefined();

    // All options visible initially
    expect(screen.getByText('Mr. Juan Dela Cruz')).toBeDefined();
    expect(screen.getByText('Engr. Roberto Santos')).toBeDefined();
    expect(screen.getByText('Dr. Alan Turing')).toBeDefined();

    // Type search query
    fireEvent.change(searchInput, { target: { value: 'Roberto' } });

    expect(screen.getByText('Engr. Roberto Santos')).toBeDefined();
    expect(screen.queryByText('Mr. Juan Dela Cruz')).toBeNull();
    expect(screen.queryByText('Dr. Alan Turing')).toBeNull();

    // Select filtered option
    fireEvent.click(screen.getByText('Engr. Roberto Santos'));
    expect(handleChange).toHaveBeenCalledWith('FAC-002');
  });

  it('displays emptyText when search yields no matches', () => {
    render(
      <SearchableSelect
        value=""
        onChange={() => {}}
        options={mockOptions}
        placeholder="Select instructor..."
        searchPlaceholder="Search here..."
        emptyText="No teachers found"
      />
    );

    const trigger = screen.getByRole('button', { name: /Select instructor.../i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search here...');
    fireEvent.change(searchInput, { target: { value: 'NonExistentPerson' } });

    expect(screen.getByText('No teachers found')).toBeDefined();
  });
});
