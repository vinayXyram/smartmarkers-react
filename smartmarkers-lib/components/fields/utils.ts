import {
  QuestionnaireItemRule,
  QuestionnaireItemOperator,
  QuestionnaireItem,
  Questionnaire,
  QuestionnaireItemType,
} from "../../models";
import { GroupItem } from "../inputs/GroupItem";
import { FieldData, FormData } from "../types";
import {
  QuestionnaireResponse,
  QuestionnaireResponseStatus,
  QuestionnaireResponseItem,
  QuestionnaireResponseItemAnswer,
} from "../../models/QuestionnaireResponse";

const DEFAULT_CHOICES = [
  {
    label: "Yes",
    value: "Y",
  },
  {
    label: "No",
    value: "N",
  },
  {
    label: "Don't know",
    value: "asked-unknown",
  },
];

const compareValues = (
  operator: QuestionnaireItemOperator,
  value: any,
  expectedValue: any
) => {
  if (value === undefined) return false;
  switch (operator) {
    case QuestionnaireItemOperator.Equals:
      return value === expectedValue;
    case QuestionnaireItemOperator.GreaterOrEquals:
      return value >= expectedValue;
    case QuestionnaireItemOperator.GreaterThan:
      return value > expectedValue;
    case QuestionnaireItemOperator.LessOrEquals:
      return value <= expectedValue;
    case QuestionnaireItemOperator.LessThan:
      return value < expectedValue;
    case QuestionnaireItemOperator.NotEquals:
      return value != expectedValue;
    case QuestionnaireItemOperator.Exists:
      return expectedValue ? !!value : !value;
    default:
      return false;
  }
};

const getExpectedRuleValue = (rule: QuestionnaireItemRule) => {
  if (rule.answerCoding) {
    return rule.answerCoding.code;
  } else if (rule.hasOwnProperty("answerBoolean")) {
    return rule.answerBoolean;
  } else if (rule.answerDecimal) {
    return rule.answerDecimal;
  } else if (rule.answerInteger) {
    return rule.answerInteger;
  } else if (rule.answerQuantity) {
    return rule.answerQuantity;
  } else if (rule.answerString) {
    return rule.answerString;
  }
  console.warn({ rule });
};

const checkRule = (rule: QuestionnaireItemRule, formData: any) => {
  const value = getFormValue(formData, rule.question).value;
  const expectedValue = getExpectedRuleValue(rule);
  return compareValues(rule.operator, value, expectedValue);
};

export const checkEnableRules = (
  rules: QuestionnaireItemRule[] | undefined,
  formData: any
): boolean => {
  let enabled = true;

  if (rules && rules.length > 0) {
    enabled = false;
    for (const rule of rules) {
      enabled = checkRule(rule, formData);
      if (enabled) break;
    }
  }

  return enabled;
};

export const getActiveQuestionsCount = (
  items: QuestionnaireItem[] | undefined,
  formData: FormData
) => {
  let count = 0;
  if (!items) return count;
  items.forEach((item) => {
    if (checkEnableRules(item.enableWhen, formData)) {
      count += 1;
    }
  });
  return count;
};

export const getActiveQuestions = (
  items: QuestionnaireItem[] | undefined,
  formData: FormData
) => {
  const result: QuestionnaireItem[] = [];
  if (!items) return result;
  items.forEach((item) => {
    if (checkEnableRules(item.enableWhen, formData)) {
      result.push(item);
    }
  });

  return result;
};

export const getFormValue = <T = any>(
  formData: FormData,
  linkId: string
): FieldData<T> => {
  if (!formData || !formData[linkId])
    return { touched: false, value: null, error: null };
  return formData[linkId];
};

export const setFormValue = <T = any>(
  formData: FormData,
  linkId: string,
  newValue: T
) => {
  if (formData)
    return {
      ...formData,
      [linkId]: { touched: true, value: newValue, error: null },
    };
  return { [linkId]: { touched: true, value: newValue, error: null } };
};

export const getLabel = (item: QuestionnaireItem) => {
  if (item.text) return item.text;
  if (item.code && item.code.length > 0) {
    let label = "";
    item.code.forEach((code) => {
      if (code.display) {
        if (label) label += ", ";
        label += code.display;
      } else if (code.code) {
        if (label) label += ", ";
        label += code.code;
      }
    });
    if (label) return label;
  }

  if (item.linkId) return item.linkId;
};

export const extractChoices = <
  T extends { label: string; value: any } = GroupItem<any>
>(
  item: QuestionnaireItem
) => {
  if (!item.answerOption) return DEFAULT_CHOICES as T[];

  return item.answerOption.map((option) => {
    if (option.valueCoding) {
      return {
        value: option.valueCoding.code,
        label: option.valueCoding.display,
      } as T;
    } else {
      return { value: "NoOptions", label: "NoOptions" } as T;
    }
  });
};

export const getResponse = (
  questionnaire: Questionnaire,
  formData: FormData
): QuestionnaireResponse => {
  const response: QuestionnaireResponse = {
    resourceType: "QuestionnaireResponse",
    status: QuestionnaireResponseStatus.InProgress,
    questionnaire: questionnaire,
    item: [],
  };

  const items = questionnaire.item ? questionnaire.item : [];

  response.item = getResponseItems(items, formData);

  return response;
};

const getResponseItems = (
  items: QuestionnaireItem[],
  formData: FormData
): QuestionnaireResponseItem[] => {
  const response: QuestionnaireResponseItem[] = [];

  items.forEach((item) => {
    const responseItem: QuestionnaireResponseItem = {
      id: item.id,
      linkId: item.linkId,
      definition: item.definition,
      text: item.text,
      extension: item.extension,
      answer: getResponseItemAnswers(item, formData),
      item: [],
    };

    if (
      ![
        QuestionnaireItemType.Group,
        QuestionnaireItemType.Question,
        QuestionnaireItemType.Display,
      ].includes(item.type) &&
      item.item &&
      item.item.length > 0
    ) {
      responseItem.item = getResponseItems(item.item, formData);
    }

    response.push(responseItem);
  });

  return response;
};

const getResponseItemAnswers = (
  item: QuestionnaireItem,
  formData: FormData
): QuestionnaireResponseItemAnswer[] => {
  const answers: QuestionnaireResponseItemAnswer[] = [];
  const value = getFormValue(formData, item.linkId);
  let valueProp = "";
  let id = 1;
  const repeats = !!item.repeats;
  switch (item.type) {
    case QuestionnaireItemType.Boolean:
      valueProp = "valueBoolean";
      break;
    case QuestionnaireItemType.Decimal:
      valueProp = "valueDecimal";
      break;
    case QuestionnaireItemType.Integer:
      valueProp = "valueInteger";
      break;
    case QuestionnaireItemType.Date:
      valueProp = "valueDate";
      break;
    case QuestionnaireItemType.DateTime:
      valueProp = "valueDateTime";
      break;
    case QuestionnaireItemType.Time:
      valueProp = "valueTime";
      break;
    case QuestionnaireItemType.String:
      valueProp = "valueString";
      break;
    case QuestionnaireItemType.Url:
      valueProp = "valueUri";
      break;
    case QuestionnaireItemType.Attachment:
      valueProp = "valueAttachment";
      break;
    case QuestionnaireItemType.Choice:
      valueProp = "valueCoding";
      break;
    case QuestionnaireItemType.OpenChoice:
      valueProp = "valueCoding";
      break;
    case QuestionnaireItemType.Quantity:
      valueProp = "valueQuantity";
      break;
    case QuestionnaireItemType.Reference:
      valueProp = "valueReference";
      break;
    case QuestionnaireItemType.Group:
    case QuestionnaireItemType.Question:
    case QuestionnaireItemType.Display:
      answers.push({
        id: id.toString(),
        extension: [],
        item: getResponseItems(item.item, formData),
      });
      break;
  }

  if (valueProp && value.value != null) {
    console.log({
      linkId: item.linkId,
      type: item.type,
      repeats,
      valueProp,
      value: value.value,
    });
    if (repeats) {
      value.value.forEach((answer: any) => {
        answers.push({
          id: id.toString(),
          extension: [],
          [valueProp]: answer,
        });

        id += 1;
      });
    } else {
      answers.push({
        id: id.toString(),
        extension: [],
        [valueProp]: value.value,
      });
    }
  }

  return answers;
};
