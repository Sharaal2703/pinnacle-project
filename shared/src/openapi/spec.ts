import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { registry, bearerAuth } from './registry';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
  UserSummarySchema,
  CreateTeacherAccountSchema,
  RegistrationOptionsDTO,
  TeacherAccountDTO
} from '../schemas/auth';
import {
  QuestionVersionDTO,
  CreateQuestionInputSchema,
  UpdateQuestionInputSchema,
  ReviewQuestionInputSchema
} from '../schemas/questions';
import {
  AssessmentConfigDTO,
  UpdateAssessmentConfigSchema
} from '../schemas/config';
import {
  StartAttemptResponseDTO,
  SafeQuestionResponseDTO,
  SubmitAnswerRequestSchema,
  SubmitAnswerResponseDTO,
  SubmitAttemptResponseDTO
} from '../schemas/attempts';
import {
  PreferenceProfileDTO,
  PreferenceProfileHistoryItemDTO
} from '../schemas/profiles';
import { ErrorResponseSchema } from '../schemas/common';
import {
  StudentAssessmentAccessDTO,
  ManagedAssessmentStudentDTO,
  AssessmentRetakeActionResponseDTO
} from '../schemas/assessment-access';

// Register Schemas
registry.register('ErrorResponse', ErrorResponseSchema);
registry.register('RegisterRequest', RegisterRequestSchema);
registry.register('LoginRequest', LoginRequestSchema);
registry.register('AuthResponse', AuthResponseSchema);
registry.register('UserSummary', UserSummarySchema);
registry.register('CreateTeacherAccount', CreateTeacherAccountSchema);
registry.register('RegistrationOptions', RegistrationOptionsDTO);
registry.register('TeacherAccount', TeacherAccountDTO);
registry.register('QuestionVersion', QuestionVersionDTO);
registry.register('CreateQuestionInput', CreateQuestionInputSchema);
registry.register('UpdateQuestionInput', UpdateQuestionInputSchema);
registry.register('ReviewQuestionInput', ReviewQuestionInputSchema);
registry.register('AssessmentConfig', AssessmentConfigDTO);
registry.register('UpdateAssessmentConfig', UpdateAssessmentConfigSchema);
registry.register('StartAttemptResponse', StartAttemptResponseDTO);
registry.register('SafeQuestionResponse', SafeQuestionResponseDTO);
registry.register('SubmitAnswerRequest', SubmitAnswerRequestSchema);
registry.register('SubmitAnswerResponse', SubmitAnswerResponseDTO);
registry.register('SubmitAttemptResponse', SubmitAttemptResponseDTO);
registry.register('PreferenceProfile', PreferenceProfileDTO);
registry.register('PreferenceProfileHistoryItem', PreferenceProfileHistoryItemDTO);
registry.register('StudentAssessmentAccess', StudentAssessmentAccessDTO);
registry.register('ManagedAssessmentStudent', ManagedAssessmentStudentDTO);
registry.register('AssessmentRetakeActionResponse', AssessmentRetakeActionResponseDTO);

// Auth Endpoints
registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/registration-options',
  summary: 'Get school and class options for registration',
  responses: {
    200: { description: 'Available schools and classes', content: { 'application/json': { schema: RegistrationOptionsDTO } } }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  summary: 'Create student account',
  request: {
    body: {
      content: { 'application/json': { schema: RegisterRequestSchema } }
    }
  },
  responses: {
    201: {
      description: 'Account created successfully',
      content: { 'application/json': { schema: AuthResponseSchema } }
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } }
    },
    409: {
      description: 'Username already taken',
      content: { 'application/json': { schema: ErrorResponseSchema } }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  summary: 'Student and Admin login',
  request: {
    body: {
      content: { 'application/json': { schema: LoginRequestSchema } }
    }
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: AuthResponseSchema } }
    },
    401: {
      description: 'Invalid credentials',
      content: { 'application/json': { schema: ErrorResponseSchema } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/me',
  summary: 'Get current user identity',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Current user profile',
      content: { 'application/json': { schema: UserSummarySchema } }
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } }
    }
  }
});

// Assessment Attempt Endpoints
registry.registerPath({
  method: 'post',
  path: '/api/v1/assessment-attempts',
  summary: 'Start or resume an assessment attempt',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Attempt started or resumed',
      content: { 'application/json': { schema: StartAttemptResponseDTO } }
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Only students can start assessments' }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/assessment-attempts/{attempt_id}/current',
  summary: 'Get safe current question and timers',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ attempt_id: z.string().uuid() })
  },
  responses: {
    200: {
      description: 'Current question',
      content: { 'application/json': { schema: SafeQuestionResponseDTO } }
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - not your attempt' },
    404: { description: 'Attempt or question not found' }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/assessment-attempts/{attempt_id}/responses',
  summary: 'Submit answer for current question',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ attempt_id: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: SubmitAnswerRequestSchema } }
    }
  },
  responses: {
    200: {
      description: 'Answer recorded',
      content: { 'application/json': { schema: SubmitAnswerResponseDTO } }
    },
    400: { description: 'Validation error or wrong question' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    409: { description: 'Duplicate answer' }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/assessment-attempts/{attempt_id}/submit',
  summary: 'Submit assessment and calculate profile',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ attempt_id: z.string().uuid() })
  },
  responses: {
    200: {
      description: 'Assessment completed or marked incomplete',
      content: { 'application/json': { schema: SubmitAttemptResponseDTO } }
    },
    400: { description: 'Unanswered questions remaining' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' }
  }
});

// Student Profile Endpoints
registry.registerPath({
  method: 'get',
  path: '/api/v1/students/me/assessment-access',
  summary: 'Check the current student assessment eligibility',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Whether the student can start or resume an assessment',
      content: { 'application/json': { schema: StudentAssessmentAccessDTO } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/students/me/preference-profile',
  summary: 'Get current student preference profile',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Current preference profile',
      content: { 'application/json': { schema: PreferenceProfileDTO } }
    },
    404: { description: 'Profile not found' }
  }
});

// Admin teacher-account management and teacher-only student access
registry.registerPath({
  method: 'get',
  path: '/api/v1/admin/teachers',
  summary: 'List teacher accounts',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Teacher account list',
      content: { 'application/json': { schema: z.array(TeacherAccountDTO) } }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/admin/teachers',
  summary: 'Create a teacher account',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: CreateTeacherAccountSchema } } } },
  responses: {
    201: {
      description: 'Teacher account created',
      content: { 'application/json': { schema: TeacherAccountDTO } }
    },
    409: { description: 'Username already exists' }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/assessment-access/students',
  summary: 'List students and their assessment access for a teacher',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Assigned students and their retake authorization state',
      content: { 'application/json': { schema: z.array(ManagedAssessmentStudentDTO) } }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/assessment-access/students/{student_id}/retake-access',
  summary: 'Authorize one retake after a student has completed an assessment (teacher only)',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ student_id: z.string().uuid() }) },
  responses: {
    200: {
      description: 'One-use retake authorization created',
      content: { 'application/json': { schema: AssessmentRetakeActionResponseDTO } }
    },
    403: { description: 'Staff member is not assigned to this student' },
    409: { description: 'Student has not completed an assessment' }
  }
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/assessment-access/students/{student_id}/retake-access',
  summary: 'Revoke an unused retake authorization (teacher only)',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ student_id: z.string().uuid() }) },
  responses: {
    200: {
      description: 'Unused authorization revoked',
      content: { 'application/json': { schema: AssessmentRetakeActionResponseDTO } }
    },
    403: { description: 'Staff member is not assigned to this student' },
    404: { description: 'No unused authorization exists' }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/students/me/preference-profiles',
  summary: 'Get student preference profile history',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Profile history',
      content: { 'application/json': { schema: z.array(PreferenceProfileHistoryItemDTO) } }
    }
  }
});

// Admin Endpoints
registry.registerPath({
  method: 'get',
  path: '/api/v1/admin/questions',
  summary: 'List question versions',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Question list',
      content: { 'application/json': { schema: z.array(QuestionVersionDTO) } }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/admin/questions',
  summary: 'Create draft question version',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateQuestionInputSchema } }
    }
  },
  responses: {
    201: {
      description: 'Question draft created',
      content: { 'application/json': { schema: QuestionVersionDTO } }
    }
  }
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/admin/questions/{question_id}',
  summary: 'Update question (creates a new version)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ question_id: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: UpdateQuestionInputSchema } }
    }
  },
  responses: {
    200: {
      description: 'New question version created',
      content: { 'application/json': { schema: QuestionVersionDTO } }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/admin/questions/{question_id}/review',
  summary: 'Record teacher review for a question version',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ question_id: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: ReviewQuestionInputSchema } }
    }
  },
  responses: {
    200: {
      description: 'Review decision recorded',
      content: { 'application/json': { schema: QuestionVersionDTO } }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/admin/questions/{question_id}/activate',
  summary: 'Activate approved question version for future attempts',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ question_id: z.string().uuid() })
  },
  responses: {
    200: {
      description: 'Question activated',
      content: { 'application/json': { schema: QuestionVersionDTO } }
    }
  }
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/admin/questions/{question_id}',
  summary: 'Deactivate question version',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ question_id: z.string().uuid() })
  },
  responses: {
    200: {
      description: 'Question deactivated'
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/admin/assessment-config',
  summary: 'Get active assessment configuration',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Active assessment configuration',
      content: { 'application/json': { schema: AssessmentConfigDTO } }
    }
  }
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/admin/assessment-config',
  summary: 'Update assessment configuration (versions config)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateAssessmentConfigSchema } }
    }
  },
  responses: {
    200: {
      description: 'Updated configuration',
      content: { 'application/json': { schema: AssessmentConfigDTO } }
    }
  }
});

export function generateOpenAPISpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'MindBridge Pre-Assessment API',
      version: '1.0.0',
      description:
        'Official API specification for MindBridge Pre-Assessment Module, governing Student Assessment and Admin Question Bank/Config operations.'
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local Development Server' }]
  });
}
