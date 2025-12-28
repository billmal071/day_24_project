import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { STRING_LENGTH } from '../../common/constants';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(STRING_LENGTH.EMAIL_MAX, { message: `Email must be less than ${STRING_LENGTH.EMAIL_MAX} characters` })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must be less than 128 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/[0-9]/, {
    message: 'Password must contain at least one number',
  })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'Password must contain at least one special character',
  })
  password: string;
}

// Password requirements for frontend validation
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  patterns: {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /[0-9]/,
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  },
  messages: {
    minLength: 'At least 8 characters',
    uppercase: 'One uppercase letter',
    lowercase: 'One lowercase letter',
    number: 'One number',
    special: 'One special character (!@#$%^&*...)',
  },
};
