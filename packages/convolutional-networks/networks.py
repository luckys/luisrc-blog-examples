import torch
from torch import nn

class Backbone(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1=nn.Conv2d(1,4,3,padding=1)
        self.pool=nn.MaxPool2d(2)
        self.conv2=nn.Conv2d(4,8,3,padding=1)
        self.gap=nn.AdaptiveAvgPool2d(1)

    def maps(self,x):
        c1=self.conv1(x)
        r1=torch.relu(c1)
        pooled=self.pool(r1)
        c2=self.conv2(pooled)
        r2=torch.relu(c2)
        return dict(conv1_pre=c1,conv1_relu=r1,pool=pooled,conv2_pre=c2,conv2_relu=r2)

    def forward(self,x):
        return self.gap(self.maps(x)['conv2_relu']).flatten(1)

class TinyCNN(nn.Module):
    def __init__(self,classes,seed):
        super().__init__()
        self.backbone=Backbone()
        self.head=nn.Linear(8,classes)
        self.frozen=False
        generator=torch.Generator().manual_seed(seed)
        for layer in [self.backbone.conv1,self.backbone.conv2]:
            nn.init.kaiming_uniform_(layer.weight,nonlinearity='relu',generator=generator)
            nn.init.zeros_(layer.bias)
        self.initialize_head(seed+3000)

    def initialize_head(self,seed):
        nn.init.xavier_uniform_(self.head.weight,generator=torch.Generator().manual_seed(seed))
        nn.init.zeros_(self.head.bias)

    def forward(self,x):
        if self.frozen:
            with torch.no_grad(): features=self.backbone(x)
        else:
            features=self.backbone(x)
        return self.head(features)

class ResidualBlock(nn.Module):
    """Post-activation educational block, not a full pretrained ResNet."""
    def __init__(self,inputs,outputs,stride=1):
        super().__init__()
        self.branch=nn.Sequential(nn.Conv2d(inputs,outputs,3,stride,padding=1,bias=False),nn.BatchNorm2d(outputs),nn.ReLU(),nn.Conv2d(outputs,outputs,3,padding=1,bias=False),nn.BatchNorm2d(outputs))
        self.skip=nn.Identity() if inputs==outputs and stride==1 else nn.Sequential(nn.Conv2d(inputs,outputs,1,stride,bias=False),nn.BatchNorm2d(outputs))

    def forward(self,x):
        return torch.relu(self.branch(x)+self.skip(x))

def configure_target(source_state,seed,mode):
    if mode not in ['scratch','random_frozen','frozen','fine_tune']:
        raise ValueError('unknown transfer mode')
    model=TinyCNN(2,seed+2000)
    model.initialize_head(seed+3000)
    if mode in ['frozen','fine_tune']:
        model.backbone.load_state_dict(source_state,strict=True)
    model.frozen=mode in ['frozen','random_frozen']
    model.backbone.requires_grad_(not model.frozen)
    return model
