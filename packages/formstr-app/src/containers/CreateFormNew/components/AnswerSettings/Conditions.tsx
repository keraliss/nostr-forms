import { Select, Button, Space, Typography, Modal, Input } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import useFormBuilderContext from "../../hooks/useFormBuilderContext";
import styled from "styled-components";
import { useState } from "react";
import { AnswerTypes } from "@formstr/sdk/dist/interfaces";

const { Text } = Typography;

const StyleWrapper = styled.div`
  .conditions {
    padding: 16px;
  }
  .property-title {
    margin-bottom: 16px;
    font-weight: 500;
  }
  .condition-rule {
    padding: 16px;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .rule-item {
    margin-bottom: 12px;
  }
  .rule-label {
    margin-bottom: 4px;
    color: rgba(0, 0, 0, 0.65);
  }
`;

interface ConditionRule {
  questionId: string;
  value: string | string[];
}

interface ConditionsProps {
  answerSettings: {
    conditions?: {
      rules: ConditionRule[];
    };
  };
  handleAnswerSettings: (settings: any) => void;
}

const Conditions: React.FC<ConditionsProps> = ({
  answerSettings,
  handleAnswerSettings,
}) => {
  const { questionsList, questionIdInFocus } = useFormBuilderContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

const availableQuestions = questionsList.filter(
  (q) => q[1] !== questionIdInFocus
);
  
  const conditions = answerSettings.conditions || {
    rules: [],
  };

  const handleAddRule = () => {
    const newConditions = {
      ...conditions,
      rules: [...conditions.rules, { questionId: "", value: "" }],
    };
    handleAnswerSettings({ conditions: newConditions });
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...conditions.rules];
    newRules.splice(index, 1);
    handleAnswerSettings({
      conditions: {
        ...conditions,
        rules: newRules,
      },
    });
  };

  const updateRule = (index: number, field: string, value: any) => {
    const newRules = [...conditions.rules];
    if (field === "questionId") {
      // Reset value when changing question
      const questionType = getQuestionType(value);
      newRules[index] = {
        questionId: value,
        value: questionType === AnswerTypes.checkboxes ? [] : "",
      };
    } else {
      newRules[index] = {
        ...newRules[index],
        [field]: value,
      };
    }
    handleAnswerSettings({
      conditions: {
        ...conditions,
        rules: newRules,
      },
    });
  };

  const getQuestionType = (questionId: string): string => {
    const question = availableQuestions.find((q) => q[1] === questionId);
    if (!question) return AnswerTypes.shortText;

    try {
      const answerSettings = JSON.parse(question[5] || "{}");
      return answerSettings.renderElement || AnswerTypes.shortText;
    } catch {
      return AnswerTypes.shortText;
    }
  };

  const getQuestionChoices = (questionId: string): Array<[string, string]> => {
    const question = availableQuestions.find((q) => q[1] === questionId);
    if (!question) return [];

    try {
      const options = JSON.parse(question[4] || "[]") as Array<
        [string, string]
      >;
      return options;
    } catch (e) {
      return [];
    }
  };

  // Render value input based on question type
  // In Conditions.tsx
const renderValueInput = (rule: ConditionRule, index: number) => {
  const questionType = getQuestionType(rule.questionId);
  const choices = getQuestionChoices(rule.questionId);

  switch (questionType) {
    case 'radioButton':
    case 'dropdown':
      return (
        <Select
          placeholder="Select answer"
          value={rule.value}
          onChange={(value) => updateRule(index, "value", value)}
          style={{ width: "100%" }}
        >
          {choices.map(([id, label]) => (
            <Select.Option key={id} value={id}>  {/* Changed to use ID instead of label */}
              {label}
            </Select.Option>
          ))}
        </Select>
      );

    case 'checkboxes':
      return (
        <Select
          mode="multiple"
          placeholder="Select answers"
          value={Array.isArray(rule.value) ? rule.value : []}
          onChange={(value) => updateRule(index, "value", value)}
          style={{ width: "100%" }}
        >
          {choices.map(([id, label]) => (
            <Select.Option key={id} value={id}>  {/* Changed to use ID instead of label */}
              {label}
            </Select.Option>
          ))}
        </Select>
      );

    default:
      return (
        <Input 
          placeholder="Enter expected answer"
          value={typeof rule.value === 'string' ? rule.value : ''}
          onChange={(e) => updateRule(index, "value", e.target.value)}
          style={{ width: "100%" }}
        />
      );
  }
};

  return (
    <StyleWrapper>
      <div className="conditions">
        <Text className="property-title">Conditions</Text>

        <Button
          type="default"
          onClick={() => setIsModalOpen(true)}
          icon={<SettingOutlined />}
          style={{ width: "100%" }}
        >
          Configure Conditions{" "}
          {conditions.rules.length > 0 && `(${conditions.rules.length})`}
        </Button>

        <Modal
          title="Configure Conditions"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>,
          ]}
          width={600}
        >
          {conditions.rules.map((rule, index) => (
            <div key={index} className="condition-rule">
              <div className="rule-item">
                <Text className="rule-label">Show this question if</Text>
                <Select
                  placeholder="Select question"
                  value={rule.questionId}
                  onChange={(value) => updateRule(index, "questionId", value)}
                  style={{ width: "100%" }}
                >
                  {availableQuestions.map((q) => (
                    <Select.Option key={q[1]} value={q[1]}>
                      {q[3]}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              <div className="rule-item">
                <Text className="rule-label">Expected answer</Text>
                {renderValueInput(rule, index)}
              </div>

              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveRule(index)}
                style={{ marginTop: 8 }}
              >
                Remove Condition
              </Button>
            </div>
          ))}

          <Button
            type="dashed"
            onClick={handleAddRule}
            icon={<PlusOutlined />}
            style={{ width: "100%" }}
          >
            Add Condition
          </Button>
        </Modal>
      </div>
    </StyleWrapper>
  );
};

export default Conditions;