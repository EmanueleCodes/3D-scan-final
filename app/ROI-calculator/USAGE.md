# Form Validation & Variant Switching System

## Overview
This system automatically switches from **Variant 1** to **Variant 2** when the form is fully validated.

## Components

### 1. FramerFormButton
The smart validation button that monitors form fields.

**Features:**
- Validates required fields are filled
- Validates email format
- Updates global store when form becomes valid
- Automatically triggers variant switch

**Usage:**
```
Add FramerFormButton to your canvas
Configure in properties panel:
  - Required Fields: ["Name", "Email"]
  - Email Fields: ["Email"]
```

### 2. Store (in Overrides.tsx)
Shared state that tracks:
- `isFormValid`: Whether form passes validation
- `currentVariant`: Current variant (1 or 2)
- `formData`: Captured form data

### 3. Overrides

#### withVariantSwitch
Apply to **any component with variants** to automatically switch to Variant 2 when form is valid.

**Usage in Framer:**
1. Select your component with variants
2. Go to Code Overrides panel
3. Select: `Overrides.tsx → withVariantSwitch`

**Behavior:**
- Shows Variant 1 when form is invalid
- Automatically switches to Variant 2 when form becomes valid

#### withFormValidation
Show/hide elements based on validation state.

**Usage:**
Apply to elements that should only appear when form is valid.

#### withFormData
Adjust element opacity based on validation state.

**Usage:**
Apply to elements that should fade in when form is valid.

## How It Works

1. **User fills form** with Name and Email
2. **FramerFormButton** validates in real-time:
   - Checks if Name is filled
   - Checks if Email is filled and valid format
   - Button becomes **enabled** when validation passes
3. **User clicks Submit button**
4. **On submit**, button updates store:
   - Sets `isFormValid = true`
   - Sets `currentVariant = 2`
   - Captures form data
5. **Components with `withVariantSwitch` override** automatically switch to Variant 2

## Example Setup

### Variant 1 (Form View)
- Name input field (name="Name")
- Email input field (name="Email")
- FramerFormButton

### Variant 2 (Results View)
- ROI Calculator results
- Calculated values
- Any other content you want to show after validation

Apply `withVariantSwitch` to the parent component/stack that contains both variants!

## Important Notes

- Input field **names must match exactly** (case-sensitive)
- Make sure inputs have the `name` property set in Framer
- Button validates in **real-time** but variant switch happens **only on submit**
- The button is disabled until all validations pass
- Variant switch is triggered when user clicks the enabled button
- No manual navigation needed!

