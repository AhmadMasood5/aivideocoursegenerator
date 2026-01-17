import { Group, Panel, Separator } from "react-resizable-panels";

function ResizablePanelGroup(props: React.ComponentProps<typeof Group>) {
  return <Group {...props} />;
}

function ResizablePanel(props: React.ComponentProps<typeof Panel>) {
  return <Panel {...props} />;
}

function ResizableHandle(props: React.ComponentProps<typeof Separator>) {
  return <Separator {...props} />;
}
