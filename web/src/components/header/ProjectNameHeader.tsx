import { graphFileName } from "../../lib/fileIO";
import { packageZipFileName } from "../../export/zipExport";
import { singleMarkdownFileName } from "../../export/singleMarkdown";
import { useGraphStore } from "../../store/graphStore";
import { InlineEditable } from "../shared/InlineEditable";

export function ProjectNameHeader() {
  const { graph, updateGraphName } = useGraphStore();

  return (
    <div className="project-name">
      <InlineEditable
        as="h1"
        className="project-name__title"
        value={graph.meta.name}
        placeholder="Untitled project"
        onCommit={updateGraphName}
      />
      <p className="project-name__exports">
        Saves as{" "}
        <code>{graphFileName(graph)}</code>
        {" · "}
        brief <code>{singleMarkdownFileName(graph)}</code>
        {" · "}
        zip <code>{packageZipFileName(graph)}</code>
      </p>
    </div>
  );
}
