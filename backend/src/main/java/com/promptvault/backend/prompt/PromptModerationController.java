package com.promptvault.backend.prompt;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/prompts")
@PreAuthorize("hasRole('ADMIN')")
public class PromptModerationController {
  private final PromptService service;

  public PromptModerationController(PromptService service) {
    this.service = service;
  }

  @GetMapping("/pending")
  public List<PromptResponse> pending() {
    return service.findPending();
  }

  @PostMapping("/{id}/approve")
  public PromptResponse approve(@PathVariable String id) {
    return service.approve(id);
  }

  @PostMapping("/{id}/reject")
  public PromptResponse reject(@PathVariable String id) {
    return service.reject(id);
  }
}

