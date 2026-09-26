import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import ReplitStorageService from "./service";

export default ModuleProvider(Modules.FILE, {
  services: [ReplitStorageService],
});
