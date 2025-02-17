import { Field, Tag, Option, Response } from "@formstr/sdk/dist/formstr/nip101";
import FillerStyle from "./formFiller.style";
import FormTitle from "../CreateFormNew/components/FormTitle";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { Button, Form, Spin, Typography } from "antd";
import { ThankYouScreen } from "./ThankYouScreen";
import { SubmitButton } from "./SubmitButton/submit";
import { isMobile } from "../../utils/utility";
import { ReactComponent as CreatedUsingFormstr } from "../../Images/created-using-formstr.svg";
import Markdown from "react-markdown";
import { Event, generateSecretKey, nip19 } from "nostr-tools";
import { FormFields } from "./FormFields";
import { RequestAccess } from "./RequestAccess";
import { fetchFormTemplate } from "@formstr/sdk/dist/formstr/nip101/fetchFormTemplate";
import { useProfileContext } from "../../hooks/useProfileContext";
import { getAllowedUsers, getFormSpec } from "../../utils/formUtils";
import { IFormSettings } from "../CreateFormNew/components/FormSettings/types";
import { AddressPointer } from "nostr-tools/nip19";
import { LoadingOutlined } from "@ant-design/icons";
import { sendNotification } from "../../nostr/common";
import { sendResponses } from "../../nostr/common";
import { AnswerTypes } from "@formstr/sdk/dist/interfaces";

// Define interfaces for condition rules and groups
interface ConditionRule {
  questionId: string;
  value: string | string[];
  operator?:
    | "equals"
    | "notEquals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan"
    | "greaterThanEqual"
    | "lessThanEqual";
  nextLogic?: "AND" | "OR"; // How this rule combines with the next one
}

interface ConditionGroup {
  rules: (ConditionRule | ConditionGroup)[];
  nextLogic?: "AND" | "OR"; // How this group combines with the next element
}

interface AnswerSettings {
  conditions?: ConditionGroup;
  renderElement?: string;
}

const { Text } = Typography;

interface FormFillerProps {
  formSpec?: Tag[];
  embedded?: boolean;
}

export const FormFiller: React.FC<FormFillerProps> = ({
  formSpec,
  embedded,
}) => {
  const { naddr } = useParams();
  let isPreview = !!formSpec;
  if (!isPreview && !naddr)
    return <Text> Not enough data to render this url </Text>;
  let decodedData;
  if (!isPreview) decodedData = nip19.decode(naddr!).data as AddressPointer;
  let pubKey = decodedData?.pubkey;
  let formId = decodedData?.identifier;
  let relays = decodedData?.relays;
  const { pubkey: userPubKey, requestPubkey } = useProfileContext();
  const [formTemplate, setFormTemplate] = useState<Tag[] | null>(
    formSpec || null
  );
  const [form] = Form.useForm();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [noAccess, setNoAccess] = useState<boolean>(false);
  const [editKey, setEditKey] = useState<string | undefined | null>();
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [thankYouScreen, setThankYouScreen] = useState(false);
  const [formEvent, setFormEvent] = useState<Event | undefined>();
  const [searchParams] = useSearchParams();
  const hideTitleImage = searchParams.get("hideTitleImage") === "true";
  const viewKeyParams = searchParams.get("viewKey");
  const hideDescription = searchParams.get("hideDescription") === "true";
  const [formAnswers, setFormAnswers] = useState<
    Record<string, string | string[]>
  >({});
  const navigate = useNavigate();

  if (!formId && !formSpec) {
    return null;
  }

  const onKeysFetched = (keys: Tag[] | null) => {
    let editKey = keys?.find((k) => k[0] === "EditAccess")?.[1] || null;
    setEditKey(editKey);
  };

  const initialize = async (
    formAuthor: string,
    formId: string,
    relays?: string[]
  ) => {
    if (!formEvent) {
      const form = await fetchFormTemplate(formAuthor, formId, relays);
      if (!form) return;
      setFormEvent(form);
      setAllowedUsers(getAllowedUsers(form));
      const formSpec = await getFormSpec(
        form,
        userPubKey,
        onKeysFetched,
        viewKeyParams
      );
      if (!formSpec) setNoAccess(true);
      setFormTemplate(formSpec);
    }
  };

  useEffect(() => {
    if (!(pubKey && formId)) {
      return;
    }
    initialize(pubKey, formId, relays);
  }, [formEvent, formTemplate, userPubKey]);

  const handleInput = (
    questionId: string,
    answer: string | string[],
    message?: string
  ) => {
    if (
      !answer ||
      (typeof answer === "string" && answer === "") ||
      (Array.isArray(answer) && answer.length === 0)
    ) {
      form.setFieldValue(questionId, null);
      setFormAnswers((prev) => ({
        ...prev,
        [questionId]: Array.isArray(answer) ? [] : "",
      }));
      return;
    }
    form.setFieldValue(questionId, [answer, message]);
    setFormAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const getResponseRelays = (formEvent: Event) => {
    let formRelays = formEvent.tags
      .filter((r) => r[0] === "relay")
      ?.map((r) => r[1]);
    return Array.from(new Set([...(relays || []), ...(formRelays || [])]));
  };

  // Determine if a condition is a rule or a group
  function isConditionRule(
    condition: ConditionRule | ConditionGroup
  ): condition is ConditionRule {
    return "questionId" in condition;
  }

  // Evaluate a single condition rule
  const evaluateRule = (
    rule: ConditionRule,
    answers: Record<string, string | string[]>,
    fields: Field[]
  ): boolean => {
    // If there's no answer or it's empty, the condition is not met
    const answer = answers[rule.questionId];
    if (
      answer === undefined ||
      answer === null ||
      (typeof answer === "string" && answer === "") ||
      (Array.isArray(answer) && answer.length === 0)
    ) {
      return false;
    }

    // Find the question to determine its type
    const question = fields.find((q) => q[1] === rule.questionId);
    if (!question) return false;

    try {
      const answerSettings = JSON.parse(question[5] || "{}") as AnswerSettings;
      const questionType = answerSettings.renderElement || "shortText";

      // Get answer and rule value as strings for text comparisons
      const answerStr = String(answer);
      const ruleValueStr = String(rule.value);

      // Handle different question types and operators
      switch (questionType) {
        case "checkboxes":
          // For checkboxes, check if all required values are selected
          const selectedValues = Array.isArray(answer) ? answer : [answer];
          const requiredValues = Array.isArray(rule.value)
            ? rule.value
            : [rule.value];

          if (rule.operator === "notEquals") {
            // At least one required value is not selected
            return !requiredValues.every((value) =>
              selectedValues.includes(value)
            );
          }
          // Default is "equals": all required values are selected
          return requiredValues.every((value) =>
            selectedValues.includes(value)
          );

        case "radioButton":
        case "dropdown":
          // For single-select questions
          if (rule.operator === "notEquals") {
            return answerStr !== ruleValueStr;
          }
          return answerStr === ruleValueStr;

        case AnswerTypes.number:
          // For numbers, apply the appropriate comparison operator
          const numAnswer = Number(answer);
          const numValue = Number(rule.value);

          if (isNaN(numAnswer) || isNaN(numValue)) return false;

          switch (rule.operator) {
            case "notEquals":
              return numAnswer !== numValue;
            case "greaterThan":
              return numAnswer > numValue;
            case "lessThan":
              return numAnswer < numValue;
            case "greaterThanEqual":
              return numAnswer >= numValue;
            case "lessThanEqual":
              return numAnswer <= numValue;
            case "equals":
            default:
              return numAnswer === numValue;
          }

        case AnswerTypes.date:
        case AnswerTypes.time:
          if (rule.operator === "notEquals") {
            return answerStr !== ruleValueStr;
          }
          return answerStr === ruleValueStr;

        default:
          // Handle text fields with various operators
          switch (rule.operator) {
            case "notEquals":
              return answerStr !== ruleValueStr;
            case "contains":
              return answerStr.includes(ruleValueStr);
            case "startsWith":
              return answerStr.startsWith(ruleValueStr);
            case "endsWith":
              return answerStr.endsWith(ruleValueStr);
            case "equals":
            default:
              return answerStr === ruleValueStr;
          }
      }
    } catch (error) {
      console.error("Error evaluating rule:", error);
      return false;
    }
  };

  // Evaluate a group of conditions
  const evaluateGroup = (
    group: ConditionGroup,
    answers: Record<string, string | string[]>,
    fields: Field[]
  ): boolean => {
    if (!group.rules || group.rules.length === 0) {
      return true;
    }

    // For backward compatibility with simple rule arrays
    if (Array.isArray(group.rules) && group.rules.length > 0 && "questionId" in group.rules[0]) {
      // Simple array of rules (old format)
      return (group.rules as ConditionRule[]).every(rule => 
        answers[rule.questionId] === rule.value
      );
    }

    // Advanced evaluation with AND/OR logic
    let result = isConditionRule(group.rules[0])
      ? evaluateRule(group.rules[0] as ConditionRule, answers, fields)
      : evaluateGroup(group.rules[0] as ConditionGroup, answers, fields);

    // Evaluate the rest of the rules, applying the appropriate logic operator
    for (let i = 1; i < group.rules.length; i++) {
      const prevRule = group.rules[i - 1];
      const currentRule = group.rules[i];

      // Get the logic type from the previous rule or default to AND
      const logicType = isConditionRule(prevRule)
        ? (prevRule as ConditionRule).nextLogic
        : (prevRule as ConditionGroup).nextLogic || "AND";
      
      // Evaluate the current rule
      const currentResult = isConditionRule(currentRule)
        ? evaluateRule(currentRule as ConditionRule, answers, fields)
        : evaluateGroup(currentRule as ConditionGroup, answers, fields);

      // Apply the logic operator
      if (logicType === "AND") {
        result = result && currentResult;
      } else {
        // OR logic
        result = result || currentResult;
      }
    }

    return result;
  };

  // Determine if a question should be displayed based on conditions
  const shouldShowQuestion = (question: Field): boolean => {
    try {
      const answerSettings = JSON.parse(question[5] || "{}") as AnswerSettings;
      const conditions = answerSettings.conditions;

      // If no conditions defined, always show the question
      if (!conditions || !conditions.rules || conditions.rules.length === 0) {
        return true;
      }

      // Get all form fields for evaluation context
      const fields =
        (formTemplate?.filter((tag) => tag[0] === "field") as Field[]) || [];

      // Evaluate the conditions
      return evaluateGroup(conditions, formAnswers, fields);
    } catch (error) {
      console.error("Error in shouldShowQuestion:", error);
      return true; // On error, show the question
    }
  };

  const onSubmit = async (anonymous: boolean = true) => {
    if (!isPreview && (!formId || !pubKey)) {
      throw "Can't submit to a form that has not been published";
    }
    
    let formResponses = form.getFieldsValue(true);
    const responses: Response[] = Object.keys(formResponses).map(
      (fieldId: string) => {
        let answer = null;
        let message = null;
        if (formResponses[fieldId]) [answer, message] = formResponses[fieldId];
        return ["response", fieldId, answer, JSON.stringify({ message })];
      }
    );
    
    // If formEvent and relays exist (non-preview mode), use sendResponses
    if (!isPreview && formEvent) {
      const anonUser = anonymous ? generateSecretKey() : null;
      sendResponses(pubKey!, formId!, responses, anonUser, true, relays).then(
        (res: any) => {
          console.log("Submitted!");
          sendNotification(formTemplate!, responses);
          setFormSubmitted(true);
          setThankYouScreen(true);
        }
      );
    } else {
      // Handle preview mode
      sendNotification(formTemplate!, responses);
      setFormSubmitted(true);
      setThankYouScreen(true);
    }
  };

  const renderSubmitButton = (settings: IFormSettings) => {
    if (isPreview) return null;
    if (!formEvent) return null;
    if (allowedUsers.length === 0) {
      return (
        <SubmitButton
          selfSign={settings.disallowAnonymous}
          edit={false}
          onSubmit={onSubmit}
          form={form}
          relays={getResponseRelays(formEvent)}
          formEvent={formEvent}
        />
      );
    } else if (!userPubKey) {
      return <Button onClick={requestPubkey}>Login to fill this form</Button>;
    } else if (userPubKey && !allowedUsers.includes(userPubKey)) {
      return <RequestAccess pubkey={pubKey!} formId={formId!} />;
    } else {
      return (
        <SubmitButton
          selfSign={true}
          edit={false}
          onSubmit={onSubmit}
          form={form}
          relays={getResponseRelays(formEvent)}
          formEvent={formEvent}
        />
      );
    }
  };

  if ((!pubKey || !formId) && !isPreview) {
    return <Text>INVALID FORM URL</Text>;
  }
  if (!formEvent && !isPreview) {
    return (
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            textAlign: "center",
            display: "block",
          }}
        >
          <Spin
            indicator={
              <LoadingOutlined
                style={{ fontSize: 48, color: "#F7931A" }}
                spin
              />
            }
          />
        </Text>
      </div>
    );
  } else if (
    !isPreview &&
    formEvent?.content !== "" &&
    !userPubKey &&
    !viewKeyParams
  ) {
    return (
      <>
        <Text>
          This form is access controlled and requires login to continue
        </Text>
        <Button
          onClick={() => {
            requestPubkey();
          }}
        >
          Login
        </Button>
      </>
    );
  }
  if (noAccess) {
    return (
      <>
        <Text>Your profile does not have access to view this form</Text>
        <RequestAccess pubkey={pubKey!} formId={formId!} />
      </>
    );
  }
  let name: string, settings: IFormSettings, fields: Field[];
  if (formTemplate) {
    name = formTemplate.find((tag) => tag[0] === "name")?.[1] || "";
    settings = JSON.parse(
      formTemplate.find((tag) => tag[0] === "settings")?.[1] || "{}"
    ) as IFormSettings;
    fields = formTemplate.filter((tag) => tag[0] === "field") as Field[];
    const visibleFields = fields.filter(shouldShowQuestion);
    
    return (
      <FillerStyle $isPreview={isPreview}>
        {!formSubmitted && (
          <div className="filler-container">
            <div className="form-filler">
              {!hideTitleImage && (
                <FormTitle
                  className="form-title"
                  edit={false}
                  imageUrl={settings?.titleImageUrl}
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

              <Form
                form={form}
                onFinish={() => {}}
                className={
                  hideDescription ? "hidden-description" : "with-description"
                }
              >
                <div>
                  <FormFields
                    fields={visibleFields}
                    handleInput={handleInput}
                  />
                  <>{renderSubmitButton(settings)}</>
                </div>
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
        )}
        {embedded ? (
          formSubmitted && (
            <div className="embed-submitted">
              <Text>Response Submitted</Text>
            </div>
          )
        ) : (
          <ThankYouScreen
            isOpen={thankYouScreen}
            onClose={() => {
              if (!embedded) {
                let navigationUrl = editKey ? `/r/${pubKey}/${formId}` : `/`;
                navigate(navigationUrl);
              } else {
                setThankYouScreen(false);
              }
            }}
          />
        )}
      </FillerStyle>
    );
  }
  return null;
};