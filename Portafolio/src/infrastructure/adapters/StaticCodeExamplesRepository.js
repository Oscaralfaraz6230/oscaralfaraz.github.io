import { CodeExamplesRepository } from '../../application/ports/CodeExamplesRepository.js';
import { portfolioCodeExamples } from '../../domain/portfolioContent.js';

export class StaticCodeExamplesRepository extends CodeExamplesRepository {
  getAll() {
    return portfolioCodeExamples;
  }
}