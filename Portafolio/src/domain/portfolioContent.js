export const portfolioCodeExamples = Object.freeze({
  react: {
    fileName: 'useExperiences.tsx',
    language: 'TypeScript Ready',
    source: `// React Hooks + TypeScript
import { useEffect, useState } from 'react';

interface Props {
  endpoint: string;
}

export function useExperiences({ endpoint }: Props) {
  const [data, setData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal })
      .then(response => response.json())
      .then(setData)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [endpoint]);

  return { data, loading };
}`
  },
  api: {
    fileName: 'experiences-api.ts',
    language: 'REST / JSON',
    source: `// Consumo de un endpoint REST con TypeScript
interface NomadExperience {
  id: string;
  name: string;
  city: string;
}

export async function getExperiences(endpoint: string): Promise<NomadExperience[]> {
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(\`Error HTTP: \${response.status}\`);
  }

  return response.json() as Promise<NomadExperience[]>;
}`
  },
  spring: {
    fileName: 'ExperienceController.java',
    language: 'Java · Spring Boot (demo)',
    source: `// Ejemplo técnico de una ruta REST con Spring Boot
@RestController
@RequestMapping("/api/experiences")
public class ExperienceController {
  private final ExperienceService experienceService;

  public ExperienceController(ExperienceService experienceService) {
    this.experienceService = experienceService;
  }

  @GetMapping
  public List<ExperienceDto> findAll() {
    return experienceService.findAll();
  }
}`
  }
});