package com.promptvault.backend.security;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Set;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
  private final UserRepository users;

  public AdminController(UserRepository users) {
    this.users = users;
  }

  public record UserRow(String id, String email, boolean active, Set<Role> roles) {
    public static UserRow from(AppUser user) {
      return new UserRow(user.getId(), user.getEmail(), user.isActive(), user.getRoles());
    }
  }

  public record UpdateRoleRequest(Role role) {}

  @GetMapping
  public List<UserRow> listActiveUsers() {
    return users.findAllByActiveTrueOrderByCreatedAtDesc().stream().map(UserRow::from).toList();
  }

  @PutMapping("/{id}/role")
  public UserRow updateRole(@PathVariable String id, @RequestBody UpdateRoleRequest request) {
    AppUser user = users.findById(id).orElseThrow(() -> new EntityNotFoundException("Usuario nao encontrado"));
    user.setRoles(Set.of(request.role() == null ? Role.USER : request.role()));
    return UserRow.from(users.save(user));
  }
}

