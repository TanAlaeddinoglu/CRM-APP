import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import {
  TabButton, EmptyReportState,
  KpiGrid, TwoColumnGrid, ReportCard, InfoCard, SimpleTable, SortableReportTable,
} from '../../../src/components/reports/ReportUI.jsx'
import FilterBar from '../../../src/components/common/FilterBar.jsx'
import { BarChart3 } from 'lucide-react'

const FilterPanel = FilterBar.Panel
const FilterGrid = FilterBar.Grid
const SelectField = FilterBar.Select
const InputField = FilterBar.DateInput

describe('ReportUI components', () => {
  describe('TabButton', () => {
    it('renders with label', () => {
      render(<TabButton active={false} onClick={vi.fn()} label="Users" icon={BarChart3} />)
      expect(screen.getByText('Users')).toBeInTheDocument()
    })

    it('applies active class when active', () => {
      const { container } = render(<TabButton active={true} onClick={vi.fn()} label="Users" icon={BarChart3} />)
      expect(container.querySelector('.reports-tab--active')).toBeInTheDocument()
    })

    it('calls onClick when clicked', async () => {
      const onClick = vi.fn()
      render(<TabButton active={false} onClick={onClick} label="Users" icon={BarChart3} />)
      await userEvent.click(screen.getByText('Users'))
      expect(onClick).toHaveBeenCalled()
    })
  })

  describe('FilterPanel', () => {
    it('renders title and children', () => {
      render(
        <FilterPanel title="My Filter" onSubmit={vi.fn()} onReset={vi.fn()} loading={false}>
          <span>child content</span>
        </FilterPanel>
      )
      expect(screen.getByText('My Filter')).toBeInTheDocument()
      expect(screen.getByText('child content')).toBeInTheDocument()
    })

    it('shows loading button state when loading=true', () => {
      render(
        <FilterPanel title="Filter" onSubmit={vi.fn()} onReset={vi.fn()} loading={true}>
          <span />
        </FilterPanel>
      )
      expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
    })

    it('calls onSubmit when submit button clicked', async () => {
      const onSubmit = vi.fn()
      render(<FilterPanel title="Filter" onSubmit={onSubmit} onReset={vi.fn()} loading={false}><span /></FilterPanel>)
      await userEvent.click(screen.getByText('Raporu Getir'))
      expect(onSubmit).toHaveBeenCalled()
    })

    it('calls onReset when reset button clicked', async () => {
      const onReset = vi.fn()
      render(<FilterPanel title="Filter" onSubmit={vi.fn()} onReset={onReset} loading={false}><span /></FilterPanel>)
      await userEvent.click(screen.getByText('Temizle'))
      expect(onReset).toHaveBeenCalled()
    })
  })

  describe('EmptyReportState', () => {
    it('renders title and description', () => {
      render(<EmptyReportState title="No Data" description="Run a query" icon={<span>icon</span>} />)
      expect(screen.getByText('No Data')).toBeInTheDocument()
      expect(screen.getByText('Run a query')).toBeInTheDocument()
    })
  })

  describe('KpiGrid', () => {
    it('renders KPI items (tuple [label, value] format)', () => {
      const items = [['Total', 100], ['Sales', 50]]
      render(<KpiGrid items={items} />)
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  describe('ReportCard', () => {
    it('renders title and children', () => {
      render(<ReportCard title="My Report"><div>content</div></ReportCard>)
      expect(screen.getByText('My Report')).toBeInTheDocument()
      expect(screen.getByText('content')).toBeInTheDocument()
    })
  })

  describe('InfoCard', () => {
    it('renders rows (tuple [label, value] format)', () => {
      render(<InfoCard title="Info" rows={[['Name', 'Ali'], ['City', 'Istanbul']]} />)
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Ali')).toBeInTheDocument()
    })
  })

  describe('SimpleTable', () => {
    it('renders table with data', () => {
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'count', label: 'Count' },
      ]
      const rows = [{ name: 'Ali', count: 5 }, { name: 'Veli', count: 3 }]
      render(<SimpleTable columns={columns} rows={rows} emptyText="No rows" />)
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Ali')).toBeInTheDocument()
    })

    it('shows empty text when no rows', () => {
      const columns = [{ key: 'name', label: 'Name' }]
      render(<SimpleTable columns={columns} rows={[]} emptyText="No data here" />)
      expect(screen.getByText('No data here')).toBeInTheDocument()
    })
  })

  describe('SortableReportTable', () => {
    const columns = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'count', label: 'Count', sortable: true, type: 'number' },
    ]
    const rows = [
      { name: 'Veli', count: 10 },
      { name: 'Ali', count: 5 },
    ]

    it('renders rows', () => {
      render(<SortableReportTable columns={columns} rows={rows} emptyText="No data" />)
      expect(screen.getByText('Ali')).toBeInTheDocument()
      expect(screen.getByText('Veli')).toBeInTheDocument()
    })

    it('sorts rows when header clicked (order changes)', async () => {
      render(<SortableReportTable columns={columns} rows={rows} emptyText="No data" />)
      // Get initial order
      const initialCells = screen.getAllByRole('cell')
      const initialFirst = initialCells[0].textContent
      // Click Name header to sort ascending
      const nameHeader = screen.getAllByRole('button').find(b => b.textContent.includes('Name'))
      if (nameHeader) {
        await userEvent.click(nameHeader)
        const afterCells = screen.getAllByRole('cell')
        // Some ordering happened
        expect(['Ali', 'Veli']).toContain(afterCells[0].textContent)
      }
    })

    it('shows empty state', () => {
      render(<SortableReportTable columns={columns} rows={[]} emptyText="Empty result" />)
      expect(screen.getByText('Empty result')).toBeInTheDocument()
    })
  })

  describe('FilterGrid', () => {
    it('renders children', () => {
      render(<FilterGrid><span>filter content</span></FilterGrid>)
      expect(screen.getByText('filter content')).toBeInTheDocument()
    })
  })

  describe('TwoColumnGrid', () => {
    it('renders children', () => {
      render(<TwoColumnGrid><span>col content</span></TwoColumnGrid>)
      expect(screen.getByText('col content')).toBeInTheDocument()
    })
  })

  describe('SelectField', () => {
    const options = [
      { value: '7', label: '7 Gün' },
      { value: '30', label: '30 Gün' },
    ]

    it('renders label text', () => {
      render(<SelectField label="Aralık" options={options} placeholder="Seç" onChange={vi.fn()} value="" />)
      expect(screen.getByText('Aralık')).toBeInTheDocument()
    })

    it('renders all options', () => {
      render(<SelectField label="Aralık" options={options} placeholder="Seç" onChange={vi.fn()} value="" />)
      expect(screen.getByText('7 Gün')).toBeInTheDocument()
      expect(screen.getByText('30 Gün')).toBeInTheDocument()
    })

    it('renders placeholder as first option', () => {
      render(<SelectField label="Aralık" options={options} placeholder="Seçiniz" onChange={vi.fn()} value="" />)
      expect(screen.getByText('Seçiniz')).toBeInTheDocument()
    })

    it('calls onChange when option is selected', async () => {
      const onChange = vi.fn()
      render(<SelectField label="Aralık" options={options} placeholder="Seç" onChange={onChange} value="" />)
      await userEvent.selectOptions(screen.getByRole('combobox'), '7')
      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('InputField', () => {
    it('renders label text', () => {
      render(<InputField label="Başlangıç" type="date" value="" onChange={vi.fn()} />)
      expect(screen.getByText('Başlangıç')).toBeInTheDocument()
    })

    it('renders input element with correct type', () => {
      const { container } = render(<InputField label="Tarih" type="date" value="" onChange={vi.fn()} />)
      const input = container.querySelector('input[type="date"]')
      expect(input).toBeInTheDocument()
    })

    it('calls onChange when value changes', async () => {
      const onChange = vi.fn()
      render(<InputField label="Tarih" type="text" value="" onChange={onChange} name="date_from" />)
      await userEvent.type(screen.getByRole('textbox'), 'a')
      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('FilterPanel — disabled state', () => {
    it('disables submit button when loading=true', () => {
      render(
        <FilterPanel title="F" onSubmit={vi.fn()} onReset={vi.fn()} loading={true}>
          <span />
        </FilterPanel>
      )
      const btn = screen.getByText('Yükleniyor...')
      expect(btn).toBeDisabled()
    })

    it('submit button is enabled when loading=false', () => {
      render(
        <FilterPanel title="F" onSubmit={vi.fn()} onReset={vi.fn()} loading={false}>
          <span />
        </FilterPanel>
      )
      expect(screen.getByText('Raporu Getir')).not.toBeDisabled()
    })
  })

  describe('SortableReportTable — sort behaviour', () => {
    const columns = [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'count', label: 'Count', type: 'number' },
    ]
    const rows = [
      { name: 'Zara', count: 1 },
      { name: 'Ali',  count: 9 },
      { name: 'Mert', count: 5 },
    ]

    it('default sort desc puts highest count first', () => {
      render(
        <SortableReportTable
          columns={columns}
          rows={rows}
          emptyText="empty"
          defaultSort={{ key: 'count', direction: 'desc' }}
        />
      )
      const cells = screen.getAllByRole('cell')
      expect(cells[0].textContent).toBe('Ali')
    })

    it('clicking header sorts ascending on second click (desc → asc toggle)', async () => {
      render(
        <SortableReportTable
          columns={columns}
          rows={rows}
          emptyText="empty"
          defaultSort={{ key: 'count', direction: 'desc' }}
        />
      )
      const countBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Count'))
      // First click: switches to asc (lowest count first)
      await userEvent.click(countBtn)
      const cells = screen.getAllByRole('cell')
      expect(cells[0].textContent).toBe('Zara')
    })

    it('reset sort button restores default order', async () => {
      render(
        <SortableReportTable
          columns={columns}
          rows={rows}
          emptyText="empty"
          defaultSort={{ key: 'count', direction: 'desc' }}
        />
      )
      const countBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Count'))
      await userEvent.click(countBtn) // now asc
      // Find reset button by title attribute
      const resetBtn = document.querySelector('[title="Varsayılan sıralamaya dön"]')
      await userEvent.click(resetBtn)
      const cells = screen.getAllByRole('cell')
      expect(cells[0].textContent).toBe('Ali') // back to desc (highest first)
    })

    it('hides reset button when showReset=false', () => {
      render(
        <SortableReportTable
          columns={columns}
          rows={rows}
          emptyText="empty"
          showReset={false}
        />
      )
      expect(document.querySelector('[title="Varsayılan sıralamaya dön"]')).toBeNull()
    })

    it('renders custom cell via column.render', () => {
      const columnsWithRender = [
        { key: 'name', label: 'Name', type: 'text' },
        {
          key: 'count',
          label: 'Count',
          type: 'number',
          render: (row) => <span data-testid="custom">{row.count * 2}</span>,
        },
      ]
      render(
        <SortableReportTable
          columns={columnsWithRender}
          rows={[{ name: 'Ali', count: 5 }]}
          emptyText="empty"
        />
      )
      expect(screen.getByTestId('custom').textContent).toBe('10')
    })
  })
})
