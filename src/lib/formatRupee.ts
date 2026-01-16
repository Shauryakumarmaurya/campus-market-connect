/**
 * Format a number as Indian Rupees with proper comma separation
 * @param amount - The amount to format
 * @returns Formatted string like "₹15,000"
 */
export function formatRupee(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}
