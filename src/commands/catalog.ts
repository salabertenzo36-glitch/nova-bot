export interface GeneratedCommandSpec {
  category: string;
  group: string;
  name: string;
  description: string;
}

const categories = [
  { prefix: "admin", count: 110, description: "Administration avancee" },
  { prefix: "fun", count: 110, description: "Fun et social" },
  { prefix: "eco", count: 110, description: "Economie et profil" },
  { prefix: "mod", count: 110, description: "Moderation serveur" },
  { prefix: "util", count: 110, description: "Outils et productivite" }
] as const;

export function buildGeneratedCatalog(): GeneratedCommandSpec[] {
  return categories.flatMap((category) =>
    Array.from({ length: category.count }, (_, index) => {
      const groupIndex = Math.floor(index / 22) + 1;
      const commandIndex = (index % 22) + 1;

      return {
        category: category.prefix,
        group: `pack${groupIndex}`,
        name: `cmd${commandIndex}`,
        description: `${category.description} ${index + 1}`
      };
    })
  );
}
