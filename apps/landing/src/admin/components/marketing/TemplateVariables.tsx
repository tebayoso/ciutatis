import { cn } from "@/lib/utils"
import { User, ShoppingCart, Package, Clock, Type } from "lucide-react"

export interface VariableDefinition {
  name: string
  description: string
  example: string
  category: 'user' | 'order' | 'product' | 'date'
}

export interface TemplateVariablesProps {
  onVariableSelect: (variable: string) => void
  className?: string
}

const VARIABLES: VariableDefinition[] = [
  { name: 'first_name', description: 'First name', example: 'John', category: 'user' },
  { name: 'last_name', description: 'Last name', example: 'Doe', category: 'user' },
  { name: 'full_name', description: 'Full name', example: 'John Doe', category: 'user' },
  { name: 'email', description: 'Email address', example: 'john@example.com', category: 'user' },
  { name: 'company', description: 'Company name', example: 'Acme Inc', category: 'user' },
  { name: 'order_number', description: 'Order number', example: 'ORD-12345', category: 'order' },
  { name: 'order_date', description: 'Order date', example: '2024-01-15', category: 'order' },
  { name: 'product_name', description: 'Product name', example: 'Premium Widget', category: 'product' },
  { name: 'product_price', description: 'Product price', example: '$49.99', category: 'product' },
  { name: 'date', description: 'Current date', example: 'January 15, 2024', category: 'date' },
  { name: 'time', description: 'Current time', example: '2:30 PM', category: 'date' },
]

const SAMPLE_DATA: Record<string, string> = {
  first_name: 'John',
  last_name: 'Doe',
  full_name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Inc',
  order_number: 'ORD-12345',
  order_date: '2024-01-15',
  product_name: 'Premium Widget',
  product_price: '$49.99',
  date: 'January 15, 2024',
  time: '2:30 PM',
}

const CATEGORY_CONFIG: Record<VariableDefinition['category'], { label: string; icon: typeof User; color: string }> = {
  user: { label: 'User Info', icon: User, color: 'text-blue-400' },
  order: { label: 'Order Info', icon: ShoppingCart, color: 'text-green-400' },
  product: { label: 'Product Info', icon: Package, color: 'text-purple-400' },
  date: { label: 'Date & Time', icon: Clock, color: 'text-amber-400' },
}

function VariableCard({
  variable,
  onClick,
}: {
  variable: VariableDefinition
  onClick: () => void
}) {
  const syntax = `{{${variable.name}}}`

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-md border border-border bg-card',
        'hover:bg-accent hover:border-primary/50',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <code className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
          {syntax}
        </code>
      </div>
      <div className="text-xs text-muted-foreground mb-1">
        {variable.description}
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Example:</span>
        <span className="font-medium text-foreground">{variable.example}</span>
      </div>
    </button>
  )
}

function CategorySection({
  category,
  variables,
  onVariableSelect,
}: {
  category: VariableDefinition['category']
  variables: VariableDefinition[]
  onVariableSelect: (variable: string) => void
}) {
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Icon className={cn('w-4 h-4', config.color)} />
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-xs text-muted-foreground">({variables.length})</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {variables.map((variable) => (
          <VariableCard
            key={variable.name}
            variable={variable}
            onClick={() => onVariableSelect(`{{${variable.name}}}`)}
          />
        ))}
      </div>
    </div>
  )
}

export function TemplateVariables({ onVariableSelect, className }: TemplateVariablesProps) {
  const groupedVariables = VARIABLES.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = []
    }
    acc[variable.category].push(variable)
    return acc
  }, {} as Record<VariableDefinition['category'], VariableDefinition[]>)

  const categories = Object.keys(groupedVariables) as VariableDefinition['category'][]

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Available Variables</span>
        </div>
        <div className="space-y-4">
          {categories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              variables={groupedVariables[category]}
              onVariableSelect={onVariableSelect}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Sample Data
        </div>
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          {Object.entries(SAMPLE_DATA).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <code className="font-mono text-muted-foreground">{'{{' + key + '}}'}</code>
              <span className="font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { VARIABLES, SAMPLE_DATA, CATEGORY_CONFIG }
