export class GetCodeExamples {
  constructor(codeExamplesRepository) {
    this.codeExamplesRepository = codeExamplesRepository;
  }

  execute() {
    return this.codeExamplesRepository.getAll();
  }
}