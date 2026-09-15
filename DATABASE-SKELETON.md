User (회원)

```jsx
import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ['ONLINE', 'MATCHING', 'ACTIVE', 'SUSPENDED'],
      // ONLINE: 접속 중
      // MATCHING: 매칭 대기 중
      // ACTIVE: 채팅 중
      // SUSPENDED: 서버에서 차단
      default: 'ONLINE',
      required: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
```

Topic (주제)

```jsx
import mongoose from 'mongoose';

const { Schema } = mongoose;

const topicOptionSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
    },

    label: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const topicSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [topicOptionSchema],
      required: true,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'CLOSED'],
      default: 'ACTIVE',
    },

    startsAt: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Topic = mongoose.model('Topic', topicSchema);
```

Conversation (채팅방)

```jsx
import mongoose from 'mongoose';

const { Schema } = mongoose;

// 채팅방에 참여한 사용자 정보
const participantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 해당 정치 주제에 대한 사용자의 입장
    stance: {
      type: String,
      required: true,
    },

    // 채팅방에서 사용할 자동 생성 익명 닉네임
    anonymousName: {
      type: String,
      required: true,
    },

    // 자동 생성 프로필 이미지 코드
    avatarCode: {
      type: String,
      required: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    leftAt: {
      type: Date,
    },
  },
  {
    // participant 자체의 별도 ObjectId는 생성하지 않음
    _id: false,
  }
);

const conversationSchema = new Schema(
  {
    // 어떤 정치 주제에 대한 채팅방인지
    topicId: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },

    // 같은 입장끼리인지, 반대 입장끼리인지
    matchType: {
      type: String,
      enum: ['SAME', 'OPPOSITE'],
      required: true,
    },

    // 현재 진행 중인지 종료되었는지
    status: {
      type: String,
      enum: ['ACTIVE', 'ENDED'],
      default: 'ACTIVE',
    },

    participants: {
      type: [participantSchema],
      required: true,
    },

    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 사용자가 참여했던 최근 채팅방을 빠르게 조회하기 위한 인덱스
conversationSchema.index({
  'participants.userId': 1,
  createdAt: -1,
});

export const Conversation = mongoose.model(
  'Conversation',
  conversationSchema
);
```

Message
```jsx
import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    // 메시지가 속한 채팅방
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },

    // 메시지를 보낸 실제 사용자
    senderUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 메시지 내용
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    // createdAt, updatedAt 자동 생성
    timestamps: true,
  }
);

/*
 * 특정 채팅방의 메시지를
 * 최신순으로 조회하기 위한 인덱스
 */
messageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

export const Message = mongoose.model(
  'Message',
  messageSchema
);

```
