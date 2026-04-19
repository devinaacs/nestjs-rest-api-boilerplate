import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "devc@example.com" })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: "strong-password" })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @ApiPropertyOptional({ example: "Devc" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
