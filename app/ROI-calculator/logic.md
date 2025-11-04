# ROI Calculator Logic

## Input Fields (Customer/User Inputs)

### Merchant Profile
- **Merchant Annual GMV**: Customer-provided annual gross merchandise volume
- **Average Order Value (AOV)**: Customer-provided average order value
- **LMN Attach Rate (%)**: Customer-provided percentage (e.g., 50%)

### Flex Impact & Pricing
- **Volume Uplift (%)**: Parameter for expected volume increase (e.g., 10%)
- **Transaction Fee (%)**: Percentage fee on incremental GMV (e.g., 4.50%)
- **Transaction Fee ($)**: Fixed fee per transaction (e.g., $0.30)
- **LMN Fee ($)**: Fixed fee per LMN transaction (e.g., $10)

## Calculated Fields

### 1. Transaction Volume
**Formula:** `Merchant Annual GMV / Average Order Value (AOV)`

**Example:** `$100,000,000 / $120 = 833,333`

### 2. Incremental GMV
**Formula:** `Merchant Annual GMV * Volume Uplift (%)`

**Example:** `$100,000,000 * 10% = $10,000,000`

### 3. Incremental Transactions
**Formula:** `Incremental GMV / Average Order Value (AOV)`

**Example:** `$10,000,000 / $120 = 83,333`

### 4. Incremental LMN Transactions
**Formula:** `Incremental Transactions * LMN Attach Rate (%)`

**Example:** `83,333 * 50% = 41,667`

### 5. Total Flex Fee
**Formula:** 
```
Total Flex Fee = (Transaction Fee (%) * Merchant Annual GMV * (1 + Volume Uplift (%)) * Volume Uplift (%))
               + (Transaction Fee ($) * Transaction Volume * Volume Uplift (%))
               + (LMN Fee ($) * Transaction Volume * Volume Uplift (%) * LMN Attach Rate (%))
```

**Example:** 
```
= (4.50% * $100,000,000 * (1 + 10%) * 10%)
+ ($0.30 * 833,333 * 10%)
+ ($10 * 833,333 * 10% * 50%)
= (0.045 * 100,000,000 * 1.10 * 0.10)
+ (0.30 * 83,333.3)
+ (10 * 41,666.65)
= $495,000 + $24,999.99 + $416,666.5
= $936,666.49
≈ $936,667
```

**Breakdown:**
1. **First component**: Transaction Fee (%) applied to the incremental GMV (which is Merchant Annual GMV * (1 + Volume Uplift) * Volume Uplift)
2. **Second component**: Transaction Fee ($) per incremental transaction
3. **Third component**: LMN Fee ($) per incremental LMN transaction

### 6. Merchant ROI (Flex)
**Formula:** `Incremental GMV / Total Flex Fee`

**Example:** `$10,000,000 / $936,667 = 10.68x`

## Implementation Strategy

### Step 1: Component Structure
Create a React component with:
- Input fields for all customer inputs and parameters
- Display-only fields for calculated values
- Organized into logical sections matching the spreadsheet layout

### Step 2: State Management
- Store all input values in React state
- Use `useEffect` or direct calculations to update outputs when inputs change

### Step 3: Calculation Order
1. Calculate **Transaction Volume** (depends on GMV and AOV)
2. Calculate **Incremental GMV** (depends on GMV and Volume Uplift)
3. Calculate **Incremental Transactions** (depends on Incremental GMV and AOV)
4. Calculate **Incremental LMN Transactions** (depends on Incremental Transactions and LMN Attach Rate)
5. Calculate **Total Flex Fee** (depends on all incremental values and fee parameters)
6. Calculate **Merchant ROI** (depends on Incremental GMV and Total Flex Fee)

### Step 4: Data Types & Formatting
- Handle percentages correctly (divide by 100 in calculations)
- Format currency values with $ and commas
- Format percentages with % symbol
- Format ROI with "x" suffix

### Step 5: Event Handling
- Attach onChange handlers to all input fields
- Trigger recalculation on any input change
- Ensure calculations update in the correct dependency order

