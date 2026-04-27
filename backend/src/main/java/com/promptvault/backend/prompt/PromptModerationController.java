package com.promptvault.backend.prompt;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.promptvault.backend.admin.AdminSecretGuard;

@RestController
@RequestMapping("/api/s/{secret}/admin/prompts")
public class PromptModerationController {
  private final PromptService service;
  private final AdminSecretGuard guard;

  public PromptModerationController(PromptService service, AdminSecretGuard guard) {
    this.service = service;
    this.guard = guard;
  }

  @GetMapping("/pending")
  public List<PromptResponse> pending(@PathVariable String secret) {
    guard.assertValid(secret);
    return service.findPending();
  }

  @PostMapping("/{id}/approve")
  public PromptResponse approve(@PathVariable String secret, @PathVariable String id) {
    guard.assertValid(secret);
    return service.approve(id);
  }

  @PostMapping("/{id}/reject")
  public PromptResponse reject(@PathVariable String secret, @PathVariable String id) {
    guard.assertValid(secret);
    return service.reject(id);
  }
}

