export type PasswordRequirement = {
  test: (password: string) => boolean
  message: string
}

export const passwordRequirements: PasswordRequirement[] = [
  {
    test: (password) => password.length >= 8,
    message:
      'Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.',
  },
  {
    test: (password) => /[A-Z]/.test(password),
    message:
      'Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.',
  },
  {
    test: (password) => /[a-z]/.test(password),
    message:
      'Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.',
  },
  {
    test: (password) => /\d/.test(password),
    message:
      'Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.',
  },
  {
    test: (password) => /[^A-Za-z0-9]/.test(password),
    message:
      'Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.',
  },
]

export function getPasswordValidationError(password: string): string | null {
  for (const requirement of passwordRequirements) {
    if (!requirement.test(password)) {
      return requirement.message
    }
  }

  return null
}
