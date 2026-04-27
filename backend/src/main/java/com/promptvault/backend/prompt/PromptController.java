package com.promptvault.backend.prompt;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/prompts")
public class PromptController {
  private final PromptService service;

  public PromptController(PromptService service) {
    this.service = service;
  }

  @GetMapping
  public List<PromptResponse> findAll() {
    return service.findAll();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public PromptResponse create(@RequestBody @Valid PromptRequest request) {
    return service.create(request);
  }

  @PostMapping("/{id}/copy")
  public PromptResponse incrementCopy(@PathVariable String id) {
    return service.incrementCopy(id);
  }
}
