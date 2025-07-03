import { Form, Typography, Steps, Button, Space, Progress, Card } from "antd";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { FormFields } from "./FormFields";
import { Field, Tag } from "../../nostr/types";
import FillerStyle from "./formFiller.style";
import FormBanner from "../../components/FormBanner";
import { IFormSettings } from "../CreateFormNew/components/FormSettings/types";
import { SectionData } from "../CreateFormNew/providers/FormBuilder/typeDefs";
import { Link } from "react-router-dom";
import { isMobile } from "../../utils/utility";
import { ReactComponent as CreatedUsingFormstr } from "../../Images/created-using-formstr.svg";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;
const { Step } = Steps;

interface FormRendererProps {
  formTemplate: Tag[];
  form: any;
  onInput: (questionId: string, answer: string, message?: string) => void;
  footer?: React.ReactNode;
  hideTitleImage?: boolean;
  hideDescription?: boolean;
}

// Content item can be either a section or individual questions
interface ContentItem {
  type: 'section' | 'questions';
  id: string;
  title: string;
  description?: string;
  fields: Field[];
  sectionData?: SectionData;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  formTemplate,
  form,
  onInput,
  footer,
  hideTitleImage,
  hideDescription,
}) => {
  const name = formTemplate.find((tag) => tag[0] === "name")?.[1] || "";
  const settings = JSON.parse(
    formTemplate.find((tag) => tag[0] === "settings")?.[1] || "{}"
  ) as IFormSettings;
  const fields = formTemplate.filter((tag) => tag[0] === "field") as Field[];

  // Section state management
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const sections = settings.sections || [];
  const enableSections = settings.enableSections && sections.length > 0;

  // Create mixed content flow
  const createContentFlow = (): ContentItem[] => {
    if (!enableSections) {
      return [{
        type: 'questions',
        id: 'all-questions',
        title: 'Form Questions',
        fields: fields
      }];
    }

    const contentItems: ContentItem[] = [];
    const sectionedQuestionIds = new Set(
      sections.flatMap((section: SectionData) => section.questionIds)
    );

    // Get unsectioned questions that appear before any section
    const unsectionedFields = fields.filter(field => !sectionedQuestionIds.has(field[1]));
    
    if (unsectionedFields.length > 0) {
      // Group unsectioned questions at the beginning
      contentItems.push({
        type: 'questions',
        id: 'unsectioned-questions',
        title: 'General Questions',
        description: 'Please answer these questions first',
        fields: unsectionedFields
      });
    }

    // Add sections
    sections.forEach((section: SectionData) => {
      const sectionQuestionIds = new Set(section.questionIds);
      const sectionFields = fields.filter(field => sectionQuestionIds.has(field[1]));
      
      if (sectionFields.length > 0) {
        contentItems.push({
          type: 'section',
          id: section.id,
          title: section.title,
          description: section.description,
          fields: sectionFields,
          sectionData: section
        });
      }
    });

    return contentItems;
  };

  const contentItems = createContentFlow();
  const currentItem = contentItems[currentStep];
  const isLastStep = currentStep >= contentItems.length - 1;

  // Calculate progress
  const progress = ((currentStep + (completedSteps.has(currentStep) ? 1 : 0)) / contentItems.length) * 100;

  // Validate current step
  const validateCurrentStep = async (): Promise<boolean> => {
    try {
      const fieldNames = currentItem?.fields.map(field => field[1]) || [];
      await form.validateFields(fieldNames);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Navigation handlers
  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
    } else if (stepIndex === currentStep + 1) {
      await handleNext();
    }
  };

  // Effect to mark step as completed when all required fields are filled
  useEffect(() => {
    const checkStepCompletion = async () => {
      if (await validateCurrentStep()) {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
      } else {
        setCompletedSteps(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentStep);
          return newSet;
        });
      }
    };

    // Small delay to allow form values to update
    const timer = setTimeout(checkStepCompletion, 100);
    return () => clearTimeout(timer);
  }, [form.getFieldsValue(), currentStep]);

  const renderSteppedForm = () => (
    <div>
      {/* Progress Bar */}
      <div style={{ marginBottom: 24 }}>
        <Progress 
          percent={Math.round(progress)} 
          showInfo={false}
          strokeColor="#FF5733"
        />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {enableSections 
            ? `Step ${currentStep + 1} of ${contentItems.length}`
            : 'Complete'
          }
        </Text>
      </div>

      {/* Steps Navigation */}
      {enableSections && contentItems.length > 1 && (
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 32 }}
          direction={isMobile() ? 'vertical' : 'horizontal'}
        >
          {contentItems.map((item, index) => (
            <Step
              key={item.id}
              title={item.title}
              description={item.description}
              status={
                completedSteps.has(index) 
                  ? 'finish' 
                  : index === currentStep 
                    ? 'process' 
                    : 'wait'
              }
              onClick={() => handleStepClick(index)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </Steps>
      )}

      {/* Current Step Content */}
      {currentItem && (
        <>
          {enableSections && contentItems.length > 1 && (
            <Card style={{ marginBottom: 24 }}>
              <Title level={4}>{currentItem.title}</Title>
              {currentItem.description && (
                <Text type="secondary">
                  <Markdown>{currentItem.description}</Markdown>
                </Text>
              )}
              {currentItem.type === 'questions' && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  {currentItem.fields.length} question{currentItem.fields.length !== 1 ? 's' : ''} in this step
                </Text>
              )}
            </Card>
          )}

          {/* Form Fields */}
          <FormFields fields={currentItem.fields} handleInput={onInput} />
        </>
      )}

      {/* Navigation Buttons */}
      {enableSections && contentItems.length > 1 && (
        <Space style={{ marginTop: 24, width: '100%', justifyContent: 'space-between' }}>
          <Button
            onClick={handleBack}
            disabled={currentStep === 0}
            icon={<LeftOutlined />}
          >
            Back
          </Button>
          
          {!isLastStep ? (
            <Button
              type="primary"
              onClick={handleNext}
            >
              Continue <RightOutlined />
            </Button>
          ) : (
            footer
          )}
        </Space>
      )}

      {/* Submit button for non-stepped forms */}
      {(!enableSections || contentItems.length <= 1) && footer}
    </div>
  );

  return (
    <FillerStyle>
      <div className="filler-container">
        <div className="form-filler">
          {!hideTitleImage && (
            <FormBanner
              imageUrl={settings?.titleImageUrl || ""}
              formTitle={name}
            />
          )}
          {!hideDescription && (
            <div className="form-description">
              <Text>
                <Markdown>{settings?.description}</Markdown>
              </Text>
            </div>
          )}
          <Form form={form} onFinish={() => {}} className="with-description">
            {renderSteppedForm()}
          </Form>
        </div>

        <div className="branding-container">
          <Link to="/">
            <CreatedUsingFormstr />
          </Link>
          {!isMobile() && (
            <a
              href="https://github.com/abhay-raizada/nostr-forms"
              className="foss-link"
            >
              <Text className="text-style">
                Formstr is free and Open Source
              </Text>
            </a>
          )}
        </div>
      </div>
    </FillerStyle>
  );
};