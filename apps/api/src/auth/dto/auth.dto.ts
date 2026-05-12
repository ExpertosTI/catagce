import { IsEmail, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'email inválido' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(6, { message: 'password mínimo 6 caracteres' })
  @MaxLength(128)
  password!: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'name mínimo 2 caracteres' })
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'email inválido' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password mínimo 8 caracteres' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug inválido (solo letras minúsculas, números y guiones)' })
  slug?: string;
}
