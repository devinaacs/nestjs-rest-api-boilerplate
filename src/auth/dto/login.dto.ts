import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "devc@example.com" })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: "strong-password" })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
