// Validate Lightning address format
export function isValidLightningAddress(address: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(address);
}

// Fetch and validate Lightning address (check if it exists)
export async function validateLightningAddress(
  address: string
): Promise<{ valid: boolean; error?: string }> {
  if (!isValidLightningAddress(address)) {
    return { valid: false, error: "Invalid format" };
  }

  try {
    const [username, domain] = address.split("@");
    const url = `https://${domain}/.well-known/lnurlp/${username}`;

    const response = await fetch(url);

    if (!response.ok) {
      return { valid: false, error: "Address not found" };
    }

    const data = await response.json();

    if (!data.callback || !data.minSendable) {
      return { valid: false, error: "Invalid Lightning address" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: "Failed to verify address",
    };
  }
}
