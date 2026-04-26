package com.promptvault.backend.llm;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LlmModelRepository extends JpaRepository<LlmModel, String> {
  List<LlmModel> findAllByActiveTrueOrderByNameAsc();

  List<LlmModel> findAllByOrderByNameAsc();

  Optional<LlmModel> findByNameIgnoreCase(String name);
}
