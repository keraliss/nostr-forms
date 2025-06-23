import { Card, Input, Select, Space } from "antd";
import { ChangeEvent, useRef, PointerEvent as ReactPointerEvent } from "react";
import useFormBuilderContext from "../../hooks/useFormBuilderContext";
import CardHeader from "./CardHeader";
import Inputs from "./Inputs";
import { AnswerSettings } from "@formstr/sdk/dist/interfaces";
import StyledWrapper from "./index.style";
import { SmallDashOutlined } from "@ant-design/icons";
import QuestionTextStyle from "./question.style";
import { Choice } from "./InputElements/OptionTypes/types";
import UploadImage from "./UploadImage";
import { Field } from "../../../../nostr/types";
import { DragControls } from "framer-motion";

type QuestionCardProps = {
  question: Field;
  onEdit: (question: Field, tempId: string) => void;
  onReorderKey: (keyType: "UP" | "DOWN", tempId: string) => void;
  firstQuestion: boolean;
  lastQuestion: boolean;
  dragControls: DragControls | undefined;
};

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onEdit,
  onReorderKey,
  firstQuestion,
  lastQuestion,
  dragControls,
}) => {
  let options = JSON.parse(question[4] || "[]") as Array<Choice>;
  const answerSettings = JSON.parse(
    question[5] || '{"renderElement": "shortText"}'
  );
  const { 
    setQuestionIdInFocus, 
    sections, 
    getSectionForQuestion, 
    moveQuestionToSection,
    formSettings 
  } = useFormBuilderContext();
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current section for this question
  const currentSectionId = getSectionForQuestion(question[1]);

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    let field = question;
    field[3] = event.target.value;
    onEdit(field, question[1]);
  };

  const handleRequiredChange = (required: boolean) => {
    let newAnswerSettings = { ...answerSettings, required };
    let field = question;
    field[5] = JSON.stringify(newAnswerSettings);
    onEdit(field, question[1]);
  };

  const onCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestionIdInFocus(question[1]);
  };

  const handleAnswerSettings = (newAnswerSettings: AnswerSettings) => {
    let field = question;
    field[5] = JSON.stringify(newAnswerSettings);
    onEdit(field, question[1]);
  };

  const handleOptions = (newOptions: Choice[]) => {
    let field = question;
    field[4] = JSON.stringify(newOptions);
    onEdit(field, question[1]);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragControls) return;
    const savedEvent = event;
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = setTimeout(() => {
      dragControls.start(savedEvent);
    }, 300);
  };

  const handlePointerUp = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  const handleSectionChange = (sectionId: string) => {
    if (sectionId === 'unsectioned') {
      moveQuestionToSection(question[1], undefined);
    } else {
      moveQuestionToSection(question[1], sectionId);
    }
  };

  return (
    <StyledWrapper>
      <Card type="inner" className="question-card" onClick={onCardClick}>
        <div className="drag-icon"
        onPointerDown={dragControls ? handlePointerDown : undefined} 
        onPointerUp={dragControls ? handlePointerUp : undefined}
        onPointerCancel={dragControls ? handlePointerUp : undefined}
        style={{ touchAction: dragControls ? "none" : "auto" }}
        >
          <SmallDashOutlined />
        </div>
        <CardHeader
          required={answerSettings.required}
          onRequired={handleRequiredChange}
          question={question}
          onReorderKey={onReorderKey}
          firstQuestion={firstQuestion}
          lastQuestion={lastQuestion}
        />
        
        {/* Section selector - only show if sections are enabled */}
        {formSettings.enableSections && sections.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Space>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>Section:</span>
              <Select
                size="small"
                value={currentSectionId || 'unsectioned'}
                onChange={handleSectionChange}
                style={{ minWidth: 120 }}
                placeholder="Select section"
              >
                <Select.Option value="unsectioned">Unsectioned</Select.Option>
                {sections.map(section => (
                  <Select.Option key={section.id} value={section.id}>
                    {section.title || 'Untitled Section'}
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </div>
        )}

        <div
          className="question-text"
          style={{ justifyContent: "space-between", display: "flex" }}
        >
          <QuestionTextStyle style={{ width: "100%" }}>
            <label>
              <Input.TextArea
                key={question[1]}
                className="question-input"
                onChange={handleTextChange}
                defaultValue={"Click to edit"}
                value={question[3] || ""}
                placeholder="Enter a Question"
                autoSize
              />
            </label>
          </QuestionTextStyle>
          <UploadImage
            onImageUpload={(markdownUrl) => {
              const currentDisplay = question[3] || "";
              const newDisplay = currentDisplay
                ? `${currentDisplay}\n\n${markdownUrl}`
                : markdownUrl;

              const field: Field = [
                question[0],
                question[1],
                question[2],
                newDisplay,
                question[4],
                question[5],
              ];

              onEdit(field, field[1]);
            }}
          />
        </div>

        <Inputs
          inputType={answerSettings.renderElement}
          options={options}
          answerSettings={answerSettings}
          answerSettingsHandler={handleAnswerSettings}
          optionsHandler={handleOptions}
        />
      </Card>
    </StyledWrapper>
  );
};

export default QuestionCard;
