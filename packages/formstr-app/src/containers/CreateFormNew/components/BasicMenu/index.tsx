import { Menu } from "antd";
import { BASIC_MENU } from "../../configs/menuConfig";
import { BASIC_MENU_KEYS } from "../../configs/constants";
import useFormBuilderContext from "../../hooks/useFormBuilderContext";

function BasicMenu() {
  const { addQuestion, addSection, sections } = useFormBuilderContext();

  const onMenuClick = ({ key }: { key: string }) => {
    if (key === BASIC_MENU_KEYS.SECTION) {
      const sectionNumber = sections.length + 1;
      addSection(`Section ${sectionNumber}`, "Click to edit section description");
      return;
    }
    
    const selectedItem = BASIC_MENU.find((item) => item.key === key);
    if (selectedItem) {
      addQuestion(
        selectedItem?.primitive,
        selectedItem?.label,
        selectedItem?.answerSettings
      );
    }
  };

  return (
    <Menu
      items={BASIC_MENU}
      onClick={onMenuClick}
      style={{ width: "100%", border: "none" }}
    />
  );
}

export default BasicMenu;
