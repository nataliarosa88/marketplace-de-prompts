package com.promptvault.backend.security;

import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final JwtEncoder encoder;
  private final String issuer;
  private final long ttlSeconds;

  public JwtService(
      JwtEncoder encoder,
      @Value("${app.security.jwt.issuer}") String issuer,
      @Value("${app.security.jwt.ttl-seconds}") long ttlSeconds) {
    this.encoder = encoder;
    this.issuer = issuer;
    this.ttlSeconds = ttlSeconds;
  }

  public String issueToken(AppUser user) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(ttlSeconds);
    List<String> roles = user.getRoles().stream().map(r -> "ROLE_" + r.name()).toList();

    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(issuer)
            .issuedAt(now)
            .expiresAt(exp)
            .subject(user.getId())
            .claim("email", user.getEmail())
            .claim("roles", roles)
            .build();

    return encoder
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims))
        .getTokenValue();
  }
}

