import { useState } from "react";
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  emailSubject: string;
  emailTemplate: string;
  whatsappTemplate: string;
  onChange: (data: { subject: string; email: string; whatsapp: string }) => void;
}

export function TemplateEditor({ emailSubject, emailTemplate, whatsappTemplate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(emailSubject);
  const [email, setEmail] = useState(emailTemplate);
  const [whatsapp, setWhatsapp] = useState(whatsappTemplate);

  const save = () => {
    onChange({ subject, email, whatsapp });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Plantillas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editor de Plantillas</DialogTitle>
          <DialogDescription>
            Variables disponibles:{" "}
            <code className="rounded bg-muted px-1 text-xs">{"{Nombre_Cliente}"}</code>{" "}
            <code className="rounded bg-muted px-1 text-xs">{"{Lista_Facturas}"}</code>{" "}
            <code className="rounded bg-muted px-1 text-xs">{"{Total_Adeudo}"}</code>
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Correo</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>
          <TabsContent value="email" className="space-y-3">
            <div>
              <Label htmlFor="subj">Asunto</Label>
              <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bod">Cuerpo</Label>
              <Textarea
                id="bod"
                rows={14}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </TabsContent>
          <TabsContent value="whatsapp">
            <Label htmlFor="wa">Mensaje WhatsApp</Label>
            <Textarea
              id="wa"
              rows={14}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="font-mono text-xs"
            />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar plantillas</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
