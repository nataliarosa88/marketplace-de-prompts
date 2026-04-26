package com.promptvault.backend.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthController(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

  public record RegisterRequest(
      @Email @NotBlank String email,
      @NotBlank @Size(min = 8, max = 72) String password) {}

  public record LoginResponse(String token, UserResponse user) {}

  public record UserResponse(String id, String email, Set<Role> roles) {
    public static UserResponse from(AppUser user) {
      return new UserResponse(user.getId(), user.getEmail(), user.getRoles());
    }
  }

  @PostMapping("/login")
  @ResponseStatus(HttpStatus.OK)
  public LoginResponse login(@RequestBody @Valid LoginRequest request) {
    AppUser user =
        users
            .findByEmailIgnoreCase(request.email().trim())
            .filter(AppUser::isActive)
            .orElseThrow(() -> new IllegalArgumentException("Credenciais invalidas"));

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new IllegalArgumentException("Credenciais invalidas");
    }

    return new LoginResponse(jwtService.issueToken(user), UserResponse.from(user));
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public LoginResponse register(@RequestBody @Valid RegisterRequest request) {
    String email = request.email().trim().toLowerCase();
    if (users.findByEmailIgnoreCase(email).isPresent()) {
      throw new IllegalArgumentException("Email ja cadastrado");
    }

    AppUser user = new AppUser();
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setRoles(Set.of(Role.USER));
    user.setActive(true);

    AppUser saved = users.save(user);
    return new LoginResponse(jwtService.issueToken(saved), UserResponse.from(saved));
  }
}

