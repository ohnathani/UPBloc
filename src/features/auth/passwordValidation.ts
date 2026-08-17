export type PasswordRequirement = {
  test: (password: string) => boolean
  message: string
}

export const passwordRequirements: PasswordRequirement[] = [
  {
    test: (password) => password.length >= 8,
    message: 'Password must contain at least 8 characters.',
  },
  {
    test: (password) => /[A-Z]/.test(password),
    message: 'Password must contain at least 1 uppercase letter.',
  },
  {
    test: (password) => /[a-z]/.test(password),
    message: 'Password must contain at least 1 lowercase letter.',
  },
  {
    test: (password) => /\d/.test(password),
    message: 'Password must contain at least 1 number.',
  },
  {
    test: (password) => /[^A-Za-z0-9]/.test(password),
    message: 'Password must contain at least 1 special character.',
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
