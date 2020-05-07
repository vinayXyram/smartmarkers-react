import React from "react";
import { Questionnaire } from "../models";
import { QuestionnaireField } from "./fields";
import { Form as NativeBaseForm, Button, Text } from "native-base";
import { FieldsMap } from "../FieldsMap";
import { FormData } from "./types";
import { WizardForm } from "./wizard/WizardForm";
import { validate } from "./validation";
import { QuestionnaireResponse } from "../models/QuestionnaireResponse";
import { getResponse } from "./fields/utils";

export enum FormMode {
  Form,
  Wizard,
}

export interface FormProps {
  questionnaire: Questionnaire;
  formData?: FormData;
  id?: string;
  mode?: FormMode;
  onChange?: (formData: FormData) => void;
  // onError?: Function;
  onSubmit?: (formData: FormData, response: QuestionnaireResponse) => void;
  onFocus?: Function;
  onBlur?: Function;
}

export type EnumDictionary<T extends string | symbol | number, U> = {
  [K in T]: U;
};

export const Form: React.FC<FormProps> = (props) => {
  const { questionnaire } = props;
  const formMode = props.mode ? props.mode : FormMode.Form;
  const isFormMode = formMode === FormMode.Form;
  const [formData, setFormData] = React.useState<any>(
    props.formData ? props.formData : {}
  );
  const [errorData, setErrorData] = React.useState<any>(
    validate(formData, questionnaire)
  );
  const submitTitle = "Submit";

  const onChange = (formData: FormData, linkId: string) => {
    const errorData = validate(formData, questionnaire);
    setErrorData(errorData);
    setFormData(formData);
    if (props.onChange) {
      props.onChange(formData);
    }
  };
  const onSubmit = (formData: FormData) => {
    if (props.onSubmit) {
      props.onSubmit(formData, getResponse(questionnaire, formData));
    }
  };
  const onBlur = (...args: any[]) => {
    if (props.onBlur) {
      props.onBlur(...args);
    }
  };

  const onFocus = (...args: any[]) => {
    if (props.onFocus) {
      props.onFocus(...args);
    }
  };

  const onSubmitPress = () => {
    onSubmit(formData);
  };

  const hasNoError =
    Object.keys(errorData).length === 0 && errorData.constructor === Object;
  return (
    <NativeBaseForm testID="nativeBaseForm">
      {isFormMode && (
        <QuestionnaireField
          testID="rootQuestionnaireField"
          fieldsMap={FieldsMap}
          questionnaire={questionnaire}
          formData={formData}
          errorData={errorData}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
        />
      )}
      {isFormMode && (
        <Button
          testID="submitButton"
          onPress={onSubmitPress}
          disabled={!hasNoError}
        >
          <Text>{submitTitle}</Text>
        </Button>
      )}
      {!isFormMode && (
        <WizardForm
          questionnaire={props.questionnaire}
          formData={props.formData}
          onChange={props.onChange}
          onBlur={props.onBlur}
          onFocus={props.onFocus}
          onSubmit={props.onSubmit}
        />
      )}
    </NativeBaseForm>
  );
};
