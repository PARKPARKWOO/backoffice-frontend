export const shouldAcceptActivationRotationReceipt = (
  activeGeneration: number,
  operationGeneration: number,
  expectedLicenseUserId: string,
  receiptLicenseUserId: string,
): boolean => activeGeneration === operationGeneration && expectedLicenseUserId === receiptLicenseUserId

export const requiresFreshActivationRotation = (errorCode: string | null): boolean =>
  errorCode === 'ACTIVATION_SECRET_ALREADY_ROTATED'
